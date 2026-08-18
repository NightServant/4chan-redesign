<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\BoardResource;
use App\Http\Resources\CommentResultResource;
use App\Http\Resources\ThreadResource;
use App\Models\Board;
use App\Models\Post;
use App\Models\Thread;
use Carbon\CarbonInterface;
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
 *
 * ## Tabs, sort and time (task 7)
 *
 * The page slices one query four ways — everything, threads, boards, replies —
 * and all three controls live in the URL rather than in component state, so
 * `/search?q=risc&type=comments&sort=latest&time=week` is shareable and
 * survives a reload. Every one of them is validated here and falls back to its
 * default rather than erroring: a link with a stale `type` on it is a page an
 * anon should still land on.
 *
 * What is *not* offered is as deliberate as what is. Reddit sorts by Top;
 * Clover has no votes — blessings were deleted — so there is no score to sort
 * by and none is invented under another name. `replies` is the honest
 * replacement and it only exists where there are replies to count, so it is
 * normalised away on the tabs that cannot answer it. Time filters on the same
 * timestamps each tab already orders by, and does not apply to boards at all:
 * a board's `created_at` is when this mirror first saw it, which means nothing
 * to an anon.
 */
class SearchController extends Controller
{
    /** Enough to be useful in a dropdown, few enough to read without scrolling. */
    private const SUGGEST_BOARDS = 4;

    private const SUGGEST_THREADS = 6;

    /** One tab's worth. Every section of the All tab is a slice, not a page. */
    private const PAGE_RESULTS = 40;

    private const ALL_TAB_RESULTS = 3;

    private const TYPES = ['all', 'posts', 'communities', 'comments'];

    private const SORTS = ['relevant', 'latest', 'replies'];

    private const TIMES = ['all', 'today', 'week', 'month'];

    public function __invoke(Request $request): Response
    {
        $query = $this->query($request);
        $showsMature = $this->showsMatureBoards($request);

        $type = $this->type($request);
        $sort = $this->sort($request, $type);
        $time = $this->time($request);

        $limit = $type === 'all' ? self::ALL_TAB_RESULTS : self::PAGE_RESULTS;

        $showsBoards = $query !== '' && in_array($type, ['all', 'communities'], true);
        $showsThreads = $query !== '' && in_array($type, ['all', 'posts'], true);
        $showsComments = $query !== '' && in_array($type, ['all', 'comments'], true);

        return Inertia::render('search', [
            'query' => $query,

            /**
             * Sent back rather than left for the page to re-read off
             * `window.location`: these are the values the results in hand were
             * actually produced with, and after a fallback they are not what
             * the URL says. A tab drawn from the URL would mark `type=videos`
             * as selected over a list of everything.
             */
            'type' => $type,
            'sort' => $sort,
            'time' => $time,

            'boards' => BoardResource::collection(
                $showsBoards
                    ? $this->boards($query, $showsMature, $sort)->limit($limit)->get()
                    : collect(),
            ),
            'threads' => ThreadResource::collection(
                $showsThreads
                    ? $this->threads($query, $showsMature, $sort, $time)->limit($limit)->get()
                    : collect(),
            ),
            'comments' => CommentResultResource::collection(
                $showsComments
                    ? $this->comments($query, $showsMature, $sort, $time)->limit($limit)->get()
                    : collect(),
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

            /**
             * The other half of the suggestions screen. A board is a place to
             * go and a thread is something to read; an anon who has not typed
             * yet may be after either, and the screen offered only the first.
             */
            'busiestThreads' => ThreadResource::collection(
                $this->busiestThreads($showsMature)->limit(self::SUGGEST_THREADS)->get(),
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
     * The busiest threads, by the only measure this application counts: how
     * many replies a thread has. Offered on the suggestions screen beside the
     * busiest boards, because a board is a place and a thread is something to
     * read, and an anon who has not typed anything yet may want either.
     *
     * Not "trending": that word claims a rate of change, and nothing here
     * records how fast a thread is moving. This is a standing count, and the
     * heading says so.
     *
     * @return Builder<Thread>
     */
    private function busiestThreads(bool $showsMature): Builder
    {
        /** @var Builder<Thread> $query */
        $query = Thread::query()
            ->onVisibleBoard($showsMature)
            ->with(['board', 'originalPost', 'bookmarks'])
            ->orderByDesc('replies_count');

        return $query;
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
     * The Communities tab, and the boards section of All.
     *
     * `latest` here is the board's most recently bumped thread, which is a
     * figure this application counts. It is deliberately *not* `created_at`:
     * that is when the sync first saw the board, not when anything happened on
     * it, and ordering by it would present a fact about this mirror as a fact
     * about 4chan. Boards with no threads sort last on that key in both SQLite
     * and MySQL, which is where a board nothing has been posted to belongs.
     *
     * @return Builder<Board>
     */
    private function boards(string $query, bool $showsMature, string $sort = 'relevant'): Builder
    {
        $like = '%'.$this->escapeLike($query).'%';

        $boards = Board::query()
            ->visible($showsMature)
            ->withCount('threads')
            ->where(function (Builder $scoped) use ($like): void {
                $scoped->where('slug', 'like', $like)
                    ->orWhere('title', 'like', $like)
                    ->orWhere('description', 'like', $like);
            });

        if ($sort === 'latest') {
            return $boards
                ->withMax('threads', 'bumped_at')
                ->orderByDesc('threads_max_bumped_at')
                ->orderByDesc('threads_count');
        }

        /* A slug match is what an anon typing "g" almost certainly meant,
           so it outranks a board that merely mentions the letter in its
           description. */
        return $boards
            ->orderByRaw('case when slug like ? then 0 else 1 end', [$like])
            ->orderByDesc('threads_count');
    }

    /**
     * The Posts tab, and the threads section of All.
     *
     * Relevance is a subject match first, then bump order — the same rule that
     * puts a board's slug above its description, for the same reason: a term
     * in the title is what the thread is about, a term in the opening post may
     * be an aside. Without it "Relevant" and "Latest" would be the identical
     * query behind two labels, which is a control that appears to do something
     * and does not.
     *
     * @return Builder<Thread>
     */
    private function threads(
        string $query,
        bool $showsMature,
        string $sort = 'relevant',
        string $time = 'all',
    ): Builder {
        $like = '%'.$this->escapeLike($query).'%';

        $threads = Thread::query()
            ->onVisibleBoard($showsMature)
            ->with(['board', 'originalPost'])
            ->where(function (Builder $scoped) use ($like): void {
                $scoped->where('subject', 'like', $like)
                    ->orWhereHas(
                        'originalPost',
                        fn (Builder $post): Builder => $post->where('body', 'like', $like),
                    );
            });

        $since = $this->since($time);

        if ($since !== null) {
            $threads->where('bumped_at', '>=', $since);
        }

        return match ($sort) {
            'latest' => $threads->orderByDesc('bumped_at'),
            'replies' => $threads->orderByDesc('replies_count')->orderByDesc('bumped_at'),
            default => $threads
                ->orderByRaw('case when subject like ? then 0 else 1 end', [$like])
                ->orderByDesc('bumped_at'),
        };
    }

    /**
     * The Comments tab: replies, and only replies.
     *
     * `is_op` is false here because an opening post is already a result on the
     * Posts tab — the thread it opens *is* that result — so including it would
     * list the same thing twice under two names.
     *
     * Visibility reuses `Thread::onVisibleBoard` through a subquery rather
     * than restating the mature rule against `posts`. A second spelling of an
     * access rule is a second place for it to be got wrong.
     *
     * Relevance orders shortest first. A reply has one searchable column and a
     * `LIKE` produces no score, so the only honest signal available is how
     * much of the reply is the term: a two-line answer that names it is more
     * about it than a two-thousand-character rant that mentions it once.
     * Recency settles ties and is what `latest` asks for outright.
     *
     * @return Builder<Post>
     */
    private function comments(
        string $query,
        bool $showsMature,
        string $sort = 'relevant',
        string $time = 'all',
    ): Builder {
        $like = '%'.$this->escapeLike($query).'%';

        $comments = Post::query()
            ->where('is_op', false)
            ->whereIn(
                'thread_id',
                Thread::query()->onVisibleBoard($showsMature)->select('id'),
            )
            ->with(['thread.board', 'thread.originalPost'])
            ->where('body', 'like', $like);

        $since = $this->since($time);

        if ($since !== null) {
            $comments->where('posted_at', '>=', $since);
        }

        return match ($sort) {
            'latest' => $comments->orderByDesc('posted_at'),
            default => $comments->orderByRaw('length(body) asc')->orderByDesc('posted_at'),
        };
    }

    /**
     * Which tab, defaulting to All.
     */
    private function type(Request $request): string
    {
        $type = $request->query('type');

        return is_string($type) && in_array($type, self::TYPES, true) ? $type : 'all';
    }

    /**
     * Which ordering, defaulting to relevance — and never one this tab cannot
     * apply.
     *
     * `replies` is a count of replies, which boards and replies themselves do
     * not have. The page drops it from the menu on those tabs; the server
     * normalises it away for the URL that arrives with it anyway, so what
     * comes back is the sort actually used rather than one the page would
     * draw as selected over results ordered some other way.
     */
    private function sort(Request $request, string $type): string
    {
        $sort = $request->query('sort');

        if (! is_string($sort) || ! in_array($sort, self::SORTS, true)) {
            return 'relevant';
        }

        if ($sort === 'replies' && ! in_array($type, ['all', 'posts'], true)) {
            return 'relevant';
        }

        return $sort;
    }

    private function time(Request $request): string
    {
        $time = $request->query('time');

        return is_string($time) && in_array($time, self::TIMES, true) ? $time : 'all';
    }

    /**
     * The cutoff a time filter means, or null for all time.
     *
     * Today is today — from midnight, not the last 24 hours, because that is
     * what the word says. The other two are rolling windows: "this week" on a
     * Monday morning would otherwise hold almost nothing.
     */
    private function since(string $time): ?CarbonInterface
    {
        return match ($time) {
            'today' => now()->startOfDay(),
            'week' => now()->subWeek(),
            'month' => now()->subMonth(),
            default => null,
        };
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
