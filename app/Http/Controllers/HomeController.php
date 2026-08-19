<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\BoardResource;
use App\Http\Resources\ThreadResource;
use App\Http\Resources\TrendingTagResource;
use App\Models\Board;
use App\Models\Thread;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Clover's homepage.
 *
 * Public and signed-out by definition, which means it always renders the
 * filtered view: `showsMatureBoards()` resolves false for a visitor with no
 * account, so the grid a first-time visitor sees carries worksafe boards only.
 * It reads the preference anyway rather than hardcoding false, because a
 * signed-in anon who has opted in and then navigates back to the homepage
 * should not be shown a different, smaller site than the one they just left.
 */
class HomeController extends Controller
{
    /** The homepage grid is a sample of the directory, not the directory. */
    private const BOARDS = 8;

    /**
     * Threads for the homepage: three for the trending strip and sixteen for
     * the hero's two rails, eight a side.
     *
     * How they are divided is the page's business, not this controller's, so
     * the split lives in `welcome.tsx` where both bands are composed. What is
     * decided here is how many to send and which ones.
     *
     * They are drawn one per board. Ordering purely by bump time gave rails
     * that could easily be eight threads from /v/, which is a poor argument
     * for a site carrying seventy-seven boards: the rails exist to show
     * breadth, so breadth is what they are selected for.
     */
    private const THREADS = 19;

    private const TRENDING = 6;

    /**
     * How deep to look for one-thread-per-board. Busy boards bump constantly,
     * so the most recent rows cluster heavily and a window the size of the
     * answer would return the same handful of boards.
     */
    private const THREAD_CANDIDATES = 400;

    public function __invoke(Request $request): Response
    {
        $showsMature = $this->showsMatureBoards($request);

        $boards = Board::query()
            ->visible($showsMature)
            ->withCount('threads')
            ->orderByDesc('threads_count')
            ->limit(self::BOARDS)
            ->get();

        /**
         * One thread per board, most recently bumped first.
         *
         * Done in PHP over a generous candidate window rather than as a
         * group-wise maximum in SQL. The window is the cost of one indexed
         * `order by bumped_at` and the de-duplication is a pass over at most
         * a few hundred rows in memory; the SQL form needs either a window
         * function or a correlated subquery per board, and this list is
         * decoration on a public page, not a report.
         */
        $threads = Thread::query()
            ->onVisibleBoard($showsMature)
            ->with(['board', 'originalPost'])
            ->orderByDesc('bumped_at')
            ->limit(self::THREAD_CANDIDATES)
            ->get()
            ->unique('board_id')
            ->take(self::THREADS)
            ->values();

        $trending = Board::query()
            ->visible($showsMature)
            ->withCount('threads')
            ->withSum('threads', 'replies_count')
            ->orderByDesc('threads_sum_replies_count')
            ->limit(self::TRENDING)
            ->get();

        return Inertia::render('welcome', [
            'boards' => BoardResource::collection($boards),

            /**
             * Without their attachments, deliberately.
             *
             * The hero and the trending strip preview real threads, which is
             * the point — they are what the product actually contains. Their
             * images are a different matter: this is the first screen a
             * visitor sees, and whatever anons uploaded in the last hour is
             * not something to put behind the pitch.
             *
             * Suppressed here rather than in the components, so the homepage
             * never receives a CDN URL and cannot request one however it is
             * later rewritten.
             */
            'threads' => $threads->map(
                fn (Thread $thread) => (new ThreadResource($thread))->withoutMedia(),
            ),

            'trending' => TrendingTagResource::collection($trending),

            /**
             * How many boards this visitor can actually reach.
             *
             * The step copy said "any of 74 boards", written by hand and
             * wrong twice over: there are 77, of which 53 are worksafe, so
             * the number matched neither what the site holds nor what a
             * signed-out visitor is shown. Counted within this anon's own
             * visibility for the same reason the feed's library panel is —
             * a page quoting a figure the directory beside it contradicts is
             * a page arguing with itself.
             */
            'boardCount' => Board::query()->visible($showsMature)->count(),
        ]);
    }
}
