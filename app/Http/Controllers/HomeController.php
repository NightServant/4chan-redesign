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

    /** Two preview cards in the hero, plus the trending strip below it. */
    private const THREADS = 6;

    private const TRENDING = 6;

    public function __invoke(Request $request): Response
    {
        $showsMature = $this->showsMatureBoards($request);

        $boards = Board::query()
            ->visible($showsMature)
            ->withCount('threads')
            ->orderByDesc('threads_count')
            ->limit(self::BOARDS)
            ->get();

        $threads = Thread::query()
            ->onVisibleBoard($showsMature)
            ->with(['board', 'originalPost' => fn ($op) => $op->withSum('votes', 'value')])
            ->orderByDesc('bumped_at')
            ->limit(self::THREADS)
            ->get();

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
        ]);
    }
}
