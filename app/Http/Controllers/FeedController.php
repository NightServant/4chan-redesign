<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\BoardResource;
use App\Http\Resources\ThreadResource;
use App\Http\Resources\TrendingTagResource;
use App\Models\Board;
use App\Models\Thread;
use Illuminate\Database\Eloquent\Collection;
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

    /** The rail lists a handful of boards, not the whole directory. */
    private const RAIL_BOARDS = 4;

    private const TRENDING_BOARDS = 6;

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
            ->with(['board', 'originalPost'])

            ->when($sort === 'bumped', fn ($query) => $query->orderByDesc('bumped_at'))

            /**
             * Blessings are Clover's own and task 11b builds them, so there is
             * nothing to order by yet. Reply count is the honest stand-in: it
             * is the activity signal the board itself runs on, and it is real.
             * This becomes an order by blessings once there are any.
             */
            ->when($sort === 'popular', fn ($query) => $query->orderByDesc('replies_count'))

            ->when($sort === 'latest', fn ($query) => $query->orderByDesc('posted_at'))
            ->limit(self::THREADS)
            ->get();

        return Inertia::render('feed', [
            'sort' => $sort,
            'threads' => ThreadResource::collection($threads),
            'boards' => BoardResource::collection($this->railBoards($showsMature)),
            'trending' => TrendingTagResource::collection($this->trendingBoards($showsMature)),
        ]);
    }

    /**
     * The busiest boards the rail lists, by how much is on them.
     *
     * @return Collection<int, Board>
     */
    private function railBoards(bool $showsMature): Collection
    {
        return Board::query()
            ->visible($showsMature)
            ->withCount('threads')
            ->orderByDesc('threads_count')
            ->limit(self::RAIL_BOARDS)
            ->get();
    }

    /**
     * @return Collection<int, Board>
     */
    private function trendingBoards(bool $showsMature): Collection
    {
        return Board::query()
            ->visible($showsMature)
            ->withCount('threads')
            ->withSum('threads', 'replies_count')
            ->orderByDesc('threads_sum_replies_count')
            ->limit(self::TRENDING_BOARDS)
            ->get();
    }
}
