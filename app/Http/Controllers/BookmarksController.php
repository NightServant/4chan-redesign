<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\RelativeTime;
use App\Http\Resources\ThreadResource;
use App\Models\Bookmark;
use App\Models\Thread;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Threads this anon saved.
 *
 * A bookmark wraps a thread rather than restating it, so the screen renders
 * the same `ThreadCard` the feed and the board pages use with the two things
 * only a bookmark carries beneath it: when it was saved, and the note.
 */
class BookmarksController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $showsMature = $this->showsMatureBoards($request);

        $bookmarks = Bookmark::query()
            ->where('user_id', $request->user()->id)

            /**
             * A saved thread on a board this anon has since opted out of stays
             * saved and stops being listed. Hiding it here rather than
             * deleting it means flipping the setting back brings it home.
             */
            ->whereIn(
                'thread_id',
                Thread::query()->onVisibleBoard($showsMature)->select('id'),
            )

            ->with([
                'thread.board',
                'thread.originalPost',
                'thread.bookmarks',
            ])
            ->orderByDesc('created_at')
            ->get();

        return Inertia::render('bookmarks', [
            'bookmarks' => $bookmarks->map(fn (Bookmark $bookmark): array => [
                'thread' => (new ThreadResource($bookmark->thread))->toArray($request),
                'savedAt' => 'Saved '.RelativeTime::since($bookmark->created_at),
                'note' => $bookmark->note,
            ])->all(),
        ]);
    }
}
