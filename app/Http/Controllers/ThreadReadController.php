<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Thread;
use App\Models\ThreadRead;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * Recording that an anon read a thread, and how far they got.
 *
 * One row per anon per thread, replaced on each visit. A history that appended
 * every visit would list the same thread six times in an afternoon, which is a
 * log rather than the screen's "what have I been reading".
 */
class ThreadReadController extends Controller
{
    public function store(Request $request, Thread $thread): RedirectResponse
    {
        $validated = $request->validate([
            'progress' => ['nullable', 'integer'],
        ]);

        abort_unless(
            $thread->board->worksafe || $this->showsMatureBoards($request),
            404,
        );

        ThreadRead::query()->updateOrCreate(
            ['user_id' => $request->user()->id, 'thread_id' => $thread->id],
            [
                /**
                 * Clamped, not trusted. The client reports this, and the
                 * history screen sorts by least finished — one value of 400
                 * would sit above everything real for as long as it existed.
                 */
                'progress' => ThreadRead::clampProgress((int) ($validated['progress'] ?? 0)),
                'last_read_at' => Carbon::now(),
            ],
        );

        return back();
    }

    /**
     * Forgetting one thread.
     *
     * The screen offers removal per row as well as a clear-all, and an anon
     * who removes a row means it: the entry is deleted rather than filtered
     * out of a list that still holds it.
     */
    public function forget(Request $request, Thread $thread): RedirectResponse
    {
        $request->user()->reads()->where('thread_id', $thread->id)->delete();

        return back();
    }

    /**
     * Clearing the history.
     *
     * The screen offers it, and an anon who asks for their reading history to
     * be forgotten should have it forgotten rather than hidden.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->user()->reads()->delete();

        return back();
    }
}
