<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\BoardDirectoryResource;
use App\Models\Board;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The board directory. Public, like the boards it lists: an anon deciding
 * whether the site is worth an account has to be able to see what is on it.
 *
 * The filtering happens in the query, not on the client. While this ran on
 * fixtures the page received every board and hid some of them, which is not a
 * boundary — data the browser holds is data the anon has, whatever the
 * interface chooses to draw. An anon who has not opted in is now never sent
 * the hidden boards at all.
 */
class CommunityController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $boards = Board::query()
            ->visible($this->showsMatureBoards($request))
            ->withCount('threads')
            ->orderBy('category')
            ->orderBy('slug')
            ->get();

        return Inertia::render('communities', [
            'boards' => BoardDirectoryResource::collection($boards),
        ]);
    }
}
