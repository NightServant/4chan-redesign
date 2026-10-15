<?php

namespace App\Http\Middleware;

use App\Http\Resources\BoardResource;
use App\Models\Board;
use App\Support\RecentActivity;
use App\Support\ThreadNotifications;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Cache;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /** How many boards the sidebar's "Boards you use" list shows. */
    private const SIDEBAR_BOARDS = 6;

    /** How long the sidebar's thread counts are reused before they are counted again. */
    private const SIDEBAR_CACHE_SECONDS = 60;

    /**
     * How many notifications the header carries.
     *
     * The menu previews three and the badge counts what it holds, so this is
     * the ceiling the badge can report: past ten it reads "9+" rather than
     * pretending to an exact figure it did not query for.
     */
    private const HEADER_NOTIFICATIONS = 10;

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $showsMature = (bool) $request->user()?->shows_mature_boards;

        /* Both sidebar lists come from one cached read, made at most once a
           request and only if a page renders the sidebar. */
        $sidebar = null;
        $sidebarFor = function () use (&$sidebar, $showsMature): array {
            return $sidebar ??= $this->sidebarBoards($showsMature);
        };

        /* The four props below are closures, which Inertia resolves only for
           a response that carries them. Everything passes this middleware:
           an image, an infinite-scroll page, a partial reload that asked for
           `auth` alone. Computed eagerly, a signed-in scroll page cost twenty
           queries instead of ten and a mature image nineteen instead of five,
           all of it discarded. */
        return [
            ...parent::share($request),
            'name' => config('app.name'),

            /**
             * The origin every `og:url` and `og:image` is built against.
             *
             * From the server rather than from `window.location`, which does
             * not exist while Inertia renders a page on the server -- and a
             * relative `og:url` is not a URL to anything.
             */
            'appUrl' => rtrim((string) config('app.url'), '/'),
            'auth' => [
                'user' => $request->user(),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',

            /**
             * Whether the composer may attach an image at all.
             *
             * Off on a deployment with no durable place to put an upload
             * (see `config('clover.attachments')`). Shared rather than
             * threaded through every page that renders a composer, for the
             * same reason `showsMatureBoards` is: the control that reads it
             * has no route of its own to be handed a prop by.
             */
            'attachmentsEnabled' => (bool) config('clover.attachments.enabled'),

            /**
             * Adult boards are hidden unless an anon opts in, so a request
             * with no account resolves to false rather than to null. The
             * directory is a public page and must not have to special-case
             * "nobody is signed in" to decide what it may show.
             */
            'showsMatureBoards' => $showsMature,

            /**
             * What this anon has been doing. Shared because two surfaces read
             * it — the feed rail and the account overview — and two copies of
             * the derivation drift. Empty for a signed-out anon, who has done
             * nothing here.
             *
             * The header's bell used to read this too, under a "Notifications"
             * label, which made it a list of the reader's own actions
             * announced back to them. Notifications are their own thing now,
             * below.
             */
            'recentActivity' => fn (): array => RecentActivity::for(
                $request->user(),
                $showsMature,
            ),

            /**
             * New replies in threads this anon is in, for the header's bell.
             *
             * Shared rather than passed per page because the header renders on
             * every screen: threading this through eleven controllers to feed
             * one menu means the first page that forgets it silently reports
             * nothing new. Capped at what the menu previews plus a little, so
             * a badge reading "9+" costs one bounded query rather than a full
             * scan on every request.
             */
            'threadNotifications' => fn (): array => ThreadNotifications::for(
                $request->user(),
                $showsMature,
                self::HEADER_NOTIFICATIONS,
            ),

            /**
             * The sidebar's two board lists.
             *
             * Shared rather than passed per page because the sidebar is app
             * chrome: it renders on every screen, and threading the same props
             * through nine controllers to feed one nav list would mean any
             * future page that forgot them silently loses part of the
             * navigation. That is also why these moved here from the feed's
             * right rail rather than being copied: the rail rendered on three
             * screens, the sidebar renders on all of them.
             *
             * Filtered by the same visibility rule as everything else. A board
             * an anon has asked not to see must not reappear in the furniture.
             *
             * `sidebarBoards` is ordered by thread count, which is what the
             * sidebar labelled "Boards you use" while showing nothing of the
             * kind. It is labelled "Popular" now, which is what it always was.
             */
            'sidebarBoards' => fn (): AnonymousResourceCollection => BoardResource::collection($sidebarFor()['popular']),

            /**
             * Busiest by conversation rather than by thread count: a board can
             * hold a great many threads nobody is replying to, and the two
             * orderings pick out genuinely different boards.
             */
            'sidebarTrending' => fn (): AnonymousResourceCollection => BoardResource::collection($sidebarFor()['trending']),
        ];
    }

    /**
     * The boards behind the sidebar's two lists, counted at most a minute ago.
     *
     * The thread counts are the expensive part, and the sidebar is on every
     * page, so they are reused for `SIDEBAR_CACHE_SECONDS` rather than
     * recounted by every request. A figure here is therefore a true count of
     * what the database held up to a minute earlier, which is what the list
     * claims to be (a ranking and a count, not a live feed), and it is not
     * invalidated by a sync: the next minute's request sees the sync.
     *
     * Keyed by visibility and by nothing else. Visibility is the only thing
     * the two queries depend on -- adult boards in or out -- so there are two
     * entries (signed out and opted out share one), and an anon who hides
     * adult boards can never be handed a list that names one.
     *
     * What depends on the individual anon is not here. `BoardResource` is built
     * from the cached rows on every request, because it reports whether *this*
     * anon follows each board; caching the resource would show one anon's
     * subscriptions to the next.
     *
     * Rows are cached as plain arrays, not as models. `cache.serializable_classes`
     * is `false`, so a cached `Collection` comes back as `__PHP_Incomplete_Class`
     * from the database store -- while the suite's array store, which never
     * serialises, hands the object straight back and passes.
     *
     * @return array{popular: Collection<int, Board>, trending: Collection<int, Board>}
     */
    private function sidebarBoards(bool $showsMature): array
    {
        /** @var array{popular: list<array<string, mixed>>, trending: list<array<string, mixed>>} $rows */
        $rows = Cache::remember(
            'clover.sidebar.'.(int) $showsMature,
            self::SIDEBAR_CACHE_SECONDS,
            fn (): array => [
                'popular' => Board::query()
                    ->visible($showsMature)
                    ->withCount('threads')
                    ->orderByDesc('threads_count')
                    ->limit(self::SIDEBAR_BOARDS)
                    ->get()
                    ->map(fn (Board $board): array => $board->getAttributes())
                    ->all(),
                'trending' => Board::query()
                    ->visible($showsMature)
                    ->withCount('threads')
                    ->withSum('threads', 'replies_count')
                    ->orderByDesc('threads_sum_replies_count')
                    ->limit(self::SIDEBAR_BOARDS)
                    ->get()
                    ->map(fn (Board $board): array => $board->getAttributes())
                    ->all(),
            ],
        );

        return [
            'popular' => Board::hydrate($rows['popular']),
            'trending' => Board::hydrate($rows['trending']),
        ];
    }
}
