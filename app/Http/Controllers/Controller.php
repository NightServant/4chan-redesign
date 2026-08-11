<?php

namespace App\Http\Controllers;

use App\Models\Board;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

abstract class Controller
{
    /**
     * Whether this request may see boards 4chan marks as not worksafe.
     *
     * Adult boards are hidden unless an anon opts in. The preference is
     * account-level and defaults to false, so a signed-out visitor resolves to
     * false here — that is the correct answer for them, not a fallback. Every
     * public surface has to work without an account, and none of them may
     * special-case "nobody is signed in" to decide what they are allowed to
     * show.
     */
    protected function showsMatureBoards(Request $request): bool
    {
        return (bool) $request->user()?->shows_mature_boards;
    }

    /**
     * The board behind a slug, or a 404 when this request may not see it.
     *
     * A 404 rather than a 403, deliberately. A 403 says "this board exists and
     * you are not allowed to see it", which confirms its existence to someone
     * who has explicitly asked not to be shown boards like it. The board is
     * simply not there as far as this request is concerned.
     */
    protected function visibleBoard(Request $request, string $slug): Board
    {
        /** @var Builder<Board> $query */
        $query = Board::query()->where('slug', $slug);

        return $query
            ->visible($this->showsMatureBoards($request))
            ->firstOrFail();
    }
}
