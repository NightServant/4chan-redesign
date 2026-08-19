<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\RelativeTime;
use App\Http\Resources\ThreadResource;
use App\Models\Board;
use App\Models\Post;
use App\Models\Thread;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The feed, in three sorts.
 *
 * All three are public: reading needs no account, which is the product's
 * central claim and should not be contradicted by the routing.
 *
 * Which sort is showing is decided here and passed as a prop rather than read
 * back out of the URL by the page, so there is exactly one source of truth for
 * it. The route supplies it as a default; see `routes/web.php`.
 */
class FeedController extends Controller
{
    /** A screenful and a bit. The page paginates below this. */
    private const THREADS = 30;

    public function __invoke(Request $request, string $sort): Response
    {
        $showsMature = $this->showsMatureBoards($request);

        $threads = Thread::query()
            ->onVisibleBoard($showsMature)

            /**
             * Eager loaded because every card needs both. Thirty threads each
             * lazily loading a board and an OP is sixty extra queries for a
             * page that can be done in three.
             */
            ->with(['board', 'originalPost', 'bookmarks'])

            ->when($sort === 'bumped', fn ($query) => $query->orderByDesc('bumped_at'))

            /**
             * By replies, which is now the only activity signal there is.
             *
             * It was always the one doing the work. Blessings were Clover's
             * own and almost nothing carried any, so ranking by them sorted
             * eleven thousand ties and called the result popularity. Reply
             * count is what the board itself runs on and it is real for every
             * row.
             */
            ->when($sort === 'popular', fn ($query) => $query->orderByDesc('replies_count'))

            ->when($sort === 'latest', fn ($query) => $query->orderByDesc('posted_at'))
            ->limit(self::THREADS)
            ->get();

        return Inertia::render('feed', [
            'sort' => $sort,
            'threads' => ThreadResource::collection($threads),

            /**
             * What the rail reports. Counted within this anon's own
             * visibility, because a panel telling a signed-out visitor the
             * site holds eleven thousand threads while the feed beside it
             * shows rather fewer is a page disagreeing with itself.
             */
            'library' => [
                'boards' => number_format(Board::query()->visible($showsMature)->count()),
                'threads' => number_format(Thread::query()->onVisibleBoard($showsMature)->count()),
                /**
                 * Whether these counts are the whole database or this reader's
                 * slice of it, decided by the same flag that scoped the
                 * queries above so the rail's heading cannot disagree with the
                 * numbers under it.
                 *
                 * The panel said "Clover holds" either way, and signed out
                 * that is 53 boards of 77 and 23,018 threads of 32,409 -- the
                 * database looking a third smaller than it is, which is how it
                 * came to be reported as a sync bug.
                 */
                'complete' => $showsMature,

                'posts' => number_format(
                    Post::query()
                        ->whereIn(
                            'thread_id',
                            Thread::query()->onVisibleBoard($showsMature)->select('id'),
                        )
                        ->count(),
                ),
                'lastSyncedAt' => ($lastSync = self::lastSyncedAt()) === null
                    ? null
                    : RelativeTime::since($lastSync),
            ],
        ]);
    }

    /**
     * When any board was last synced, as a date rather than a string.
     *
     * Read through the model so Eloquent's cast applies. `max('synced_at')`
     * returns whatever the driver hands back, which is a raw string, and
     * `RelativeTime::since()` type-hints `?DateTimeInterface` — so the
     * aggregate form type-errored on every request that had a board to
     * report. It only survived the test suite because those cases had no
     * boards at all and took the null branch.
     */
    private static function lastSyncedAt(): ?\DateTimeInterface
    {
        return Board::query()->latest('synced_at')->first()?->synced_at;
    }
}
