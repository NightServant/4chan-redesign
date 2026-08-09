<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

/**
 * A single thread, e.g. `/g/58210441`.
 *
 * Both parameters arrive constrained by the route: the board to a known slug,
 * the post number to digits. Once the backend lands this resolves the thread
 * and its replies rather than handing the client an identifier to look up in
 * fixtures.
 */
class ThreadController extends Controller
{
    public function __invoke(string $board, string $thread): Response
    {
        return Inertia::render('thread', [
            'slug' => "/{$board}/",
            'no' => (int) $thread,
        ]);
    }
}
