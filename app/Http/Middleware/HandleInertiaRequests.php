<?php

namespace App\Http\Middleware;

use App\Http\Resources\BoardResource;
use App\Models\Board;
use App\Support\RecentActivity;
use App\Support\ThreadNotifications;
use Illuminate\Http\Request;
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
             * Adult boards are hidden unless an anon opts in, so a request
             * with no account resolves to false rather than to null. The
             * directory is a public page and must not have to special-case
             * "nobody is signed in" to decide what it may show.
             */
            'showsMatureBoards' => (bool) $request->user()?->shows_mature_boards,

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
            'recentActivity' => RecentActivity::for(
                $request->user(),
                (bool) $request->user()?->shows_mature_boards,
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
            'threadNotifications' => ThreadNotifications::for(
                $request->user(),
                (bool) $request->user()?->shows_mature_boards,
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
            'sidebarBoards' => BoardResource::collection(
                Board::query()
                    ->visible((bool) $request->user()?->shows_mature_boards)
                    ->withCount('threads')
                    ->orderByDesc('threads_count')
                    ->limit(self::SIDEBAR_BOARDS)
                    ->get(),
            ),

            /**
             * Busiest by conversation rather than by thread count: a board can
             * hold a great many threads nobody is replying to, and the two
             * orderings pick out genuinely different boards.
             */
            'sidebarTrending' => BoardResource::collection(
                Board::query()
                    ->visible((bool) $request->user()?->shows_mature_boards)
                    ->withCount('threads')
                    ->withSum('threads', 'replies_count')
                    ->orderByDesc('threads_sum_replies_count')
                    ->limit(self::SIDEBAR_BOARDS)
                    ->get(),
            ),
        ];
    }
}
