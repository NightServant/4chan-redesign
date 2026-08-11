<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Bookmark;
use App\Models\Thread;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Saving a thread, and the note an anon writes on it.
 *
 * Private to the account. Nothing about a bookmark is visible on the thread or
 * to anyone else — what an anon reads is not something the board publishes.
 */
class BookmarkController extends Controller
{
    /** Long enough for a reminder, short enough not to be a second post. */
    private const NOTE_MAX = 500;

    public function store(Request $request, Thread $thread): RedirectResponse
    {
        $validated = $request->validate([
            'note' => ['nullable', 'string', 'max:'.self::NOTE_MAX],
        ]);

        $this->assertVisible($request, $thread);

        /**
         * Idempotent: saving a thread twice updates the note rather than
         * failing on the unique index. The button is a toggle in the
         * interface, and a double submit is a double press, not an error.
         */
        Bookmark::query()->updateOrCreate(
            ['user_id' => $request->user()->id, 'thread_id' => $thread->id],
            ['note' => $validated['note'] ?? ''],
        );

        return back();
    }

    public function destroy(Request $request, Thread $thread): RedirectResponse
    {
        Bookmark::query()
            ->where('user_id', $request->user()->id)
            ->where('thread_id', $thread->id)
            ->delete();

        return back();
    }

    /**
     * A thread on a board this anon may not see is one they may not save.
     * Otherwise the visibility gate covers reading only, and a hidden board's
     * threads stay reachable by id.
     */
    private function assertVisible(Request $request, Thread $thread): void
    {
        abort_unless(
            $thread->board->worksafe || $this->showsMatureBoards($request),
            404,
        );
    }
}
