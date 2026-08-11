<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\AttachmentResource;
use App\Models\Thread;
use App\Models\ThreadRead;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
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
        $now = Carbon::now();

        $reads = ThreadRead::query()
            ->where('user_id', $request->user()->id)
            ->whereIn(
                'thread_id',
                Thread::query()->onVisibleBoard($showsMature)->select('id'),
            )
            ->with(['thread.board', 'thread.originalPost'])
            ->orderByDesc('last_read_at')
            ->get();

        return Inertia::render('history', [
            'entries' => $reads->map(fn (ThreadRead $read): array => [
                'id' => $read->thread->id,
                'no' => $read->thread->no,
                'board' => $read->thread->board->displaySlug(),
                'title' => $read->thread->displayTitle(),
                'when' => $this->when($read->last_read_at, $now),

                /**
                 * The day decided here rather than parsed back off the front
                 * of `when`. The screen used to read the prose, which worked
                 * only because a fixture wrote `Today,` by hand — a real
                 * timestamp knows its own day.
                 */
                'day' => $this->day($read->last_read_at, $now),

                'progress' => $read->progress,
                'media' => AttachmentResource::for($read->thread->originalPost, $request),
            ])->all(),
        ]);
    }

    /**
     * `Today, 14:02`, `Yesterday, 09:15`, or a date for anything older.
     */
    private function when(Carbon $moment, Carbon $now): string
    {
        return match ($this->day($moment, $now)) {
            'Today' => 'Today, '.$moment->format('H:i'),
            'Yesterday' => 'Yesterday, '.$moment->format('H:i'),
            default => $moment->format('j M Y, H:i'),
        };
    }

    /**
     * Calendar days, not elapsed ones: an anon reading "Yesterday" means the
     * day before today, and thirty hours ago can be either.
     */
    private function day(Carbon $moment, Carbon $now): string
    {
        $days = $moment->copy()->startOfDay()->diffInDays($now->copy()->startOfDay(), absolute: true);

        return match (true) {
            $days < 1 => 'Today',
            $days < 2 => 'Yesterday',
            default => 'Earlier',
        };
    }
}
