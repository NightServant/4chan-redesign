<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\CommentTree;
use App\Http\Resources\ThreadResource;
use App\Models\Thread;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * A single thread, e.g. `/g/109522303`.
 *
 * A post number matching nothing is the **ordinary** case here, not an
 * exceptional one: the route constrains `thread` to digits, so every number
 * reaches this page and almost none of them are threads. It renders a real
 * not-found state rather than a 404, because the board it belongs to does
 * exist and the anon has not mistyped the site — they have followed a link to
 * a thread that has since been pruned, which happens constantly on an
 * imageboard.
 *
 * A board this anon may not see is a different matter and does 404, before any
 * of this runs.
 */
class ThreadController extends Controller
{
    public function __invoke(Request $request, string $board, string $thread): Response
    {
        $model = $this->visibleBoard($request, $board);

        $no = (int) $thread;

        $found = Thread::query()
            ->where('board_id', $model->id)
            ->where('no', $no)
            ->with(['board', 'originalPost', 'posts'])
            ->first();

        return Inertia::render('thread', [
            'slug' => $model->displaySlug(),
            'no' => $no,
            'thread' => $found === null ? null : new ThreadResource($found),
            'comments' => $found === null ? [] : CommentTree::for($found),
            'maxCommentChars' => $model->max_comment_chars,
        ]);
    }
}
