<?php

namespace App\Http\Middleware;

use App\Http\Resources\BoardResource;
use App\Models\Board;
use App\Support\RecentActivity;
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
             * The sidebar's board list.
             *
             * What this anon has been doing. Shared because three surfaces
             * read it — the header's notification menu, the feed rail and the
             * account overview — and three copies of the derivation drift.
             * Empty for a signed-out anon, who has done nothing here.
             */
            'recentActivity' => RecentActivity::for(
                $request->user(),
                (bool) $request->user()?->shows_mature_boards,
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
