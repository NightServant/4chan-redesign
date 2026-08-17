<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\BoardResource;
use App\Http\Resources\ThreadResource;
use App\Models\Board;
use App\Models\Thread;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Finding a board or a thread.
 *
 * Searches this application's own database, not 4chan. There is no search
 * endpoint upstream — the API is `boards.json`, `catalog.json` and a thread
 * page, nothing else — and a browser cannot call it anyway, since 4chan sends
 * no CORS headers. What is searched is what has been synced, which is every
 * board and eleven thousand threads.
 *
 * Two entry points for one query. `suggest` answers the dropdown in the header
 * and returns JSON, because a list that updates while an anon types is not a
 * page visit and should not push history. `__invoke` renders the same query as
 * a page, for pressing Enter and for a URL worth sharing.
 */
class SearchController extends Controller
{
    /** Enough to be useful in a dropdown, few enough to read without scrolling. */
    private const SUGGEST_BOARDS = 4;

    private const SUGGEST_THREADS = 6;

    private const PAGE_THREADS = 40;

    public function __invoke(Request $request): Response
    {
        $query = $this->query($request);
        $showsMature = $this->showsMatureBoards($request);

        return Inertia::render('search', [
            'query' => $query,
            'boards' => BoardResource::collection(
                $query === '' ? collect() : $this->boards($query, $showsMature)->get(),
            ),
            'threads' => ThreadResource::collection(
                $query === ''
                    ? collect()
                    : $this->threads($query, $showsMature)->limit(self::PAGE_THREADS)->get(),
            ),

            /**
             * The empty-query suggestions screen below `md` (task 6). Sent
             * unconditionally rather than only when `query` is empty: the
             * query behind it does not depend on what was searched, and a
             * client-side `query === ''` branch reading it is simpler than a
             * prop that sometimes is not there. `boards` and `threads` above
             * stay empty for an empty query regardless -- that pair drives
             * the unrelated results sections at `md` and up, unchanged by
             * this task.
             */
            'busiestBoards' => BoardResource::collection(
                $this->busiestBoards($showsMature)->limit(self::SUGGEST_BOARDS)->get(),
            ),
        ]);
    }

    /**
     * The header dropdown's data.
     *
     * An empty query is not an error and does not return nothing: it returns
     * the busiest boards, which is what an anon who has just clicked into the
     * field can usefully be offered before they have said anything.
     */
    public function suggest(Request $request): JsonResponse
    {
        $query = $this->query($request);
        $showsMature = $this->showsMatureBoards($request);

        $boards = $query === ''
            ? $this->busiestBoards($showsMature)
            : $this->boards($query, $showsMature);

        return response()->json([
            'query' => $query,
            'boards' => BoardResource::collection($boards->limit(self::SUGGEST_BOARDS)->get()),
            'threads' => $query === ''
                ? []
                : ThreadResource::collection(
                    $this->threads($query, $showsMature)->limit(self::SUGGEST_THREADS)->get(),
                ),
        ]);
    }

    /**
     * The busiest boards, offered before an anon has typed anything — to
     * `suggest`'s own empty-query branch, and to the search page's
     * empty-query suggestions screen below `md`. One query, two callers,
     * rather than the same `Board::query()->visible(...)->withCount(...)`
     * written out twice.
     *
     * @return Builder<Board>
     */
    private function busiestBoards(bool $showsMature): Builder
    {
        return Board::query()
            ->visible($showsMature)
            ->withCount('threads')
            ->orderByDesc('threads_count');
    }

    /**
     * @return Builder<Board>
     */
    private function boards(string $query, bool $showsMature): Builder
    {
        $like = '%'.$this->escapeLike($query).'%';

        return Board::query()
            ->visible($showsMature)
            ->withCount('threads')
            ->where(function (Builder $scoped) use ($like): void {
                $scoped->where('slug', 'like', $like)
                    ->orWhere('title', 'like', $like)
                    ->orWhere('description', 'like', $like);
            })
            /* A slug match is what an anon typing "g" almost certainly meant,
               so it outranks a board that merely mentions the letter in its
               description. */
            ->orderByRaw('case when slug like ? then 0 else 1 end', [$like])
            ->orderByDesc('threads_count');
    }

    /**
     * @return Builder<Thread>
     */
    private function threads(string $query, bool $showsMature): Builder
    {
        $like = '%'.$this->escapeLike($query).'%';

        return Thread::query()
            ->onVisibleBoard($showsMature)
            ->with(['board', 'originalPost'])
            ->where(function (Builder $scoped) use ($like): void {
                $scoped->where('subject', 'like', $like)
                    ->orWhereHas(
                        'originalPost',
                        fn (Builder $post): Builder => $post->where('body', 'like', $like),
                    );
            })
            ->orderByDesc('bumped_at');
    }

    private function query(Request $request): string
    {
        $query = $request->query('q');

        return is_string($query) ? trim($query) : '';
    }

    /**
     * `%` and `_` are wildcards in a `LIKE` pattern, so an anon searching for
     * `100%` would otherwise match everything. Escaped rather than stripped,
     * because those characters appear in real thread subjects.
     */
    private function escapeLike(string $value): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value);
    }
}
