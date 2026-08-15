<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\ThreadResource;
use App\Models\Thread;
use App\Models\ThreadRead;
use Carbon\CarbonInterface;
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
                'when' => $this->when($read->last_read_at, $now),

                /**
                 * The day decided here rather than parsed back off the front
                 * of `when`. The screen used to read the prose, which worked
                 * only because a fixture wrote `Today,` by hand — a real
                 * timestamp knows its own day.
                 */
                'day' => $this->day($read->last_read_at, $now),
            ])->all(),
        ]);
    }

    /**
     * `Today, 14:02`, `Yesterday, 09:15`, or a date for anything older.
     */
    /**
     * Typed to the interface, not to `Illuminate\Support\Carbon`.
     *
     * The models cast their timestamps to `CarbonImmutable`, so a concrete
     * hint type-errors on every row — the same mistake `RelativeTime` made in
     * task 11a, where it only surfaced on threads older than a day and so
     * survived that resource's own tests.
     */
    private function when(CarbonInterface $moment, CarbonInterface $now): string
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
    private function day(CarbonInterface $moment, CarbonInterface $now): string
    {
        $days = $moment->copy()->startOfDay()->diffInDays($now->copy()->startOfDay(), absolute: true);

        return match (true) {
            $days < 1 => 'Today',
            $days < 2 => 'Yesterday',
            default => 'Earlier',
        };
    }
}
