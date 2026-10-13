<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\BoardResource;
use App\Http\Resources\ThreadResource;
use App\Services\FourChan\LiveFetch;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Inertia\Support\Header;

/**
 * A single board, e.g. `/g/`.
 *
 * The slug arrives constrained to a routable board, which is a routing concern
 * and not an access one: the constraint is what stops `/rules` resolving as a
 * board, and it knows nothing about who is asking. Whether *this* anon may see
 * *this* board is decided here, by `visibleBoard()`, which 404s rather than
 * 403s so the board's existence is not confirmed to someone who has asked not
 * to see boards like it.
 *
 * Opening a board refetches its catalog from 4chan when the stored one is
 * more than a minute old (`LiveFetch`), before the threads are read, so the
 * page shows what 4chan shows rather than what the last sweep saw. That is
 * best effort: a failed or slow fetch renders the stored copy.
 */
class BoardController extends Controller
{
    /** One board page's worth. Each page after the first is another of these. */
    private const THREADS = 40;

    /** The orderings a board page offers; the first is the default. */
    private const SORTS = ['bumped', 'new', 'replies'];

    public function __invoke(Request $request, string $board, LiveFetch $live): Response
    {
        $model = $this->visibleBoard($request, $board);

        /**
         * Only for the first page of a sort. A later page is
         * `<InfiniteScroll>` scrolling through what the first one already
         * refreshed, so it reads the stored copy and never spends a request
         * on 4chan's one-per-second budget.
         *
         * Told apart by the header the component sends, not by a `cursor` in
         * the URL: anyone can type `?cursor=anything`, and a page that
         * skipped the refresh for that would serve a stale first page.
         */
        if (! $request->hasHeader(Header::INFINITE_SCROLL_MERGE_INTENT)) {
            $live->board($model);
        }

        $sort = $this->sort($request);

        $threads = $model->threads()->with(['board', 'originalPost', 'bookmarks']);

        /**
         * Ordered by the database, over the whole board, so a tab means what
         * it says on every page. `no` is unique per board, which is all a
         * cursor needs for New; the others break ties on the id.
         */
        $threads = match ($sort) {
            'new' => $threads->orderByDesc('no'),
            'replies' => $threads->orderByDesc('replies_count')->orderByDesc('id'),
            default => $threads->orderByDesc('bumped_at')->orderByDesc('id'),
        };

        return Inertia::render('board', [
            'board' => (new BoardResource($model->loadCount('threads')))->withDescription(),

            /** The ordering the threads below were produced with, which the tabs mark as current. */
            'sort' => $sort,
            'threads' => Inertia::scroll(ThreadResource::collection($threads->cursorPaginate(self::THREADS)))
                ->matchOn('data.id'),

            /**
             * The board's own limit, not a global one. `boards.json` reports
             * `max_comment_chars` per board and it is really 2000, 3000 or
             * 5000 depending on where you are posting, so a composer that
             * imported one constant was telling two thirds of the site the
             * wrong number.
             */
            'maxCommentChars' => $model->max_comment_chars,
        ]);
    }

    /**
     * Which ordering, falling back to bump order for anything else -- a link
     * with a stale `sort` on it is a page an anon should still land on.
     */
    private function sort(Request $request): string
    {
        $sort = $request->query('sort');

        return is_string($sort) && in_array($sort, self::SORTS, true) ? $sort : self::SORTS[0];
    }
}
