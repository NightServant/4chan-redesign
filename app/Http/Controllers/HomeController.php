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
            ->with(['board', 'originalPost'])
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
            'threads' => ThreadResource::collection($threads),
            'trending' => TrendingTagResource::collection($trending),
        ]);
    }
}
