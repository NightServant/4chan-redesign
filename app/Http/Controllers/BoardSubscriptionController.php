<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Board;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Following a board.
 *
 * The Join buttons on the rail and in the directory have been local component
 * state since they were built — pressed, then forgotten on reload. This is
 * what they write to.
 */
class BoardSubscriptionController extends Controller
{
    public function store(Request $request, Board $board): RedirectResponse
    {
        $this->assertVisible($request, $board);

        /* Idempotent, so a double press subscribes once rather than failing. */
        $request->user()->subscribedBoards()->syncWithoutDetaching([$board->id]);

        return back();
    }

    public function destroy(Request $request, Board $board): RedirectResponse
    {
        $request->user()->subscribedBoards()->detach($board->id);

        return back();
    }

    /**
     * Subscribing to a board this anon has asked not to see would put it in
     * their sidebar, which is the one place the filter has to hold hardest.
     */
    private function assertVisible(Request $request, Board $board): void
    {
        abort_unless(
            $board->worksafe || $this->showsMatureBoards($request),
            404,
        );
    }
}
