<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\ThreadReadTime;
use App\Http\Resources\ThreadResource;
use App\Models\Thread;
use App\Models\ThreadRead;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Inertia\Inertia;
use Inertia\Response;

/**
 * What this anon has been reading.
 *
 * One entry per thread, showing the last time they were there — the table
 * records it that way, because a history that listed every visit would show
 * the same thread six times in an afternoon.
 */
class HistoryController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $showsMature = $this->showsMatureBoards($request);
        $now = Date::now();

        $reads = ThreadRead::query()
            ->where('user_id', $request->user()->id)
            ->whereIn(
                'thread_id',
                Thread::query()->onVisibleBoard($showsMature)->select('id'),
            )
            ->with(['thread.board', 'thread.originalPost', 'thread.bookmarks'])
            ->orderByDesc('last_read_at')
            ->get();

        return Inertia::render('history', [
            /**
             * The thread itself, as the feed receives it, plus when this anon
             * was last on it.
             *
             * This used to be a shape of its own — a title, a board, a post
             * number and an attachment, flattened by hand — which is how the
             * history screen ended up looking nothing like the feed it is a
             * history of. Sending the same resource means the same card, and
             * means a field added to threads reaches both screens rather than
             * one.
             */
            'entries' => $reads->map(fn (ThreadRead $read): array => [
                'thread' => ThreadResource::make($read->thread)->resolve($request),
                'when' => ThreadReadTime::when($read->last_read_at, $now),

                /**
                 * The day decided here rather than parsed back off the front
                 * of `when`. The screen used to read the prose, which worked
                 * only because a fixture wrote `Today,` by hand — a real
                 * timestamp knows its own day.
                 */
                'day' => ThreadReadTime::day($read->last_read_at, $now),
            ])->all(),
        ]);
    }
}
