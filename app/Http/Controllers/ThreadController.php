<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\CommentTree;
use App\Http\Resources\ThreadResource;
use App\Models\Thread;
use App\Services\FourChan\LiveFetch;
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
 *
 * Opening a thread refetches its posts from 4chan when they were last synced
 * more than half a minute ago, or never (`LiveFetch`). The page does not wait
 * on it: the thread and its opening post go out as stored, and the replies and
 * the thread's counts follow as one deferred group that runs the fetch. A
 * prefetch is a plain visit that never asks for the group, so hovering a link
 * costs 4chan nothing. A thread that needs no refresh renders everything
 * inline, as it always did.
 *
 * Best effort: a failed or slow fetch, or a thread that has gone 404
 * upstream, answers the group with the stored copy. A thread that is not
 * stored at all is not fetched into existence; the board page's catalog fetch
 * is what brings new threads in.
 */
class ThreadController extends Controller
{
    /** The deferred props that wait on a refresh; `thread.tsx` waits on the same two. */
    private const LIVE_GROUP = 'live';

    public function __invoke(Request $request, string $board, string $thread, LiveFetch $live): Response
    {
        $model = $this->visibleBoard($request, $board);

        $no = (int) $thread;

        $found = Thread::query()
            ->where('board_id', $model->id)
            ->where('no', $no)
            ->first();

        if ($found === null) {
            return Inertia::render('thread', [
                'slug' => $model->displaySlug(),
                'no' => $no,
                'thread' => null,
                'comments' => [],
                'liveThread' => null,
                'maxCommentChars' => $model->max_comment_chars,
            ]);
        }

        if (! $live->needsRefresh($found) && ! $this->isFollowingUpOnLive($request)) {
            $found->load(['board', 'originalPost', 'posts']);

            return Inertia::render('thread', [
                'slug' => $model->displaySlug(),
                'no' => $no,
                'thread' => new ThreadResource($found),
                'comments' => CommentTree::for($found),
                'liveThread' => null,
                'maxCommentChars' => $model->max_comment_chars,
            ]);
        }

        $found->load(['board', 'originalPost']);

        /**
         * Both deferred props answer from one refresh, whichever the request
         * reaches first: the replies and the counts above them have to come
         * from the same fetch, or the header would claim a number the list
         * does not show.
         *
         * Rescued, so an exception here omits the two props and the page says
         * the replies could not load, rather than the follow-up failing and
         * the client waiting on a skeleton for ever. The flag is set only once
         * the work is done, so the second prop retries rather than answering
         * from a half-loaded thread.
         */
        $refreshed = false;
        $refresh = function () use (&$refreshed, $live, $model, $found): Thread {
            if (! $refreshed) {
                $live->thread($model, $found);
                $found->load(['board', 'originalPost', 'posts']);
                $refreshed = true;
            }

            return $found;
        };

        return Inertia::render('thread', [
            'slug' => $model->displaySlug(),
            'no' => $no,
            'thread' => new ThreadResource($found),
            'comments' => Inertia::defer(fn (): array => CommentTree::for($refresh()), self::LIVE_GROUP, rescue: true),
            'liveThread' => Inertia::defer(fn (): ThreadResource => new ThreadResource($refresh()), self::LIVE_GROUP, rescue: true),
            'maxCommentChars' => $model->max_comment_chars,
        ]);
    }

    /**
     * Whether this is the client collecting the deferred group.
     *
     * Someone else may have refreshed the thread between the page and this
     * follow-up, so `needsRefresh` is false by now. Answering with the props
     * inline would send `liveThread` as null, and the header would keep the
     * count it was stored with beside replies that are newer.
     */
    private function isFollowingUpOnLive(Request $request): bool
    {
        $asked = explode(',', (string) $request->header('X-Inertia-Partial-Data'));

        return in_array('liveThread', $asked, true);
    }
}
