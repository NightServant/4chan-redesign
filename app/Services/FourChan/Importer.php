<?php

declare(strict_types=1);

namespace App\Services\FourChan;

use App\Models\Board;
use App\Models\Post;
use App\Models\Thread;
use App\Services\LocalPostNumbers;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Date;

/**
 * Turns a decoded upstream payload into rows.
 *
 * Kept apart from `Client` so the mapping can be tested against a recorded
 * response without a request, and apart from the command so the command is
 * only orchestration and reporting.
 *
 * Thread and post writes are bulk. Each is one element of an `upsert` rather
 * than a select and an insert of its own: against a database that is a network
 * hop away, the per-row version spent hours on one pass over the boards with
 * nothing wrong in any single query. `upsert` bypasses Eloquent's casts and
 * events, so the cast work is done here by hand — `quotes` is encoded, and
 * dates are bound as the cast would have formatted them — and neither `Thread`
 * nor `Post` has an observer for the bypass to skip.
 *
 * The one method that deletes is `pruneThreads()`, and it is only called with
 * a catalog that came back `200` for a whole board. A `304`, a failure or a
 * `404` cannot tell "this thread is gone" from "this request did not answer",
 * and guessing wrong empties the site; a `200` listing every thread the board
 * has can, because absence from it is the answer.
 */
final class Importer
{
    /**
     * Rows per statement. Postgres caps a statement at 65,535 bound parameters
     * and a post is about two dozen of them, so 500 stays well inside it. A
     * catalog or a thread page is a single statement in practice.
     */
    private const CHUNK = 500;

    /**
     * What an upsert overwrites on a post that already exists. `thread_id` and
     * `no` are the key. `user_id`, `is_local` and `media_path` are left out on
     * purpose: they belong to posts written here, and re-importing an upstream
     * post must never reach them.
     *
     * @var array<int, string>
     */
    private const POST_COLUMNS = [
        'is_op', 'author', 'tripcode', 'capcode', 'body', 'quotes', 'posted_at',
        'media_filename', 'media_extension', 'media_tim', 'media_width', 'media_height',
        'media_thumb_width', 'media_thumb_height', 'media_size', 'media_spoiler',
    ];

    public function __construct(private readonly CommentParser $parser) {}

    /**
     * Upsert every board in a `boards.json` payload.
     *
     * @param  array<array-key, mixed>  $payload
     * @return array<int, string> the slugs written, in payload order
     */
    public function importBoards(array $payload): array
    {
        $categories = $this->categoryLookup();
        $syncedAt = Date::now();
        $slugs = [];

        foreach ($this->rows($payload, 'boards') as $row) {
            $slug = $this->string($row, 'board');

            if ($slug === '') {
                continue;
            }

            Board::query()->updateOrCreate(['slug' => $slug], [
                'title' => $this->string($row, 'title', $slug),
                /** `meta_description` arrives HTML-escaped: `4chan&#039;s board for …`. */
                'description' => $this->decode($this->string($row, 'meta_description')),
                'category' => $categories[$slug] ?? $this->defaultCategory(),
                'worksafe' => $this->bool($row, 'ws_board'),
                'max_comment_chars' => $this->int($row, 'max_comment_chars'),
                'bump_limit' => $this->int($row, 'bump_limit'),
                'image_limit' => $this->int($row, 'image_limit'),
                'per_page' => $this->int($row, 'per_page'),
                'pages' => $this->int($row, 'pages'),
                'is_archived' => $this->bool($row, 'is_archived'),
                'synced_at' => $syncedAt,
            ]);

            $slugs[] = $slug;
        }

        return $slugs;
    }

    /**
     * Upsert the most recently bumped threads from a `catalog.json` payload.
     *
     * The catalog arrives as pages, in page order, which is bump order already;
     * it is re-sorted anyway because relying on that would make the cap depend
     * on upstream's paging staying the way it is today.
     *
     * Three statements for a board, however many threads it has: the threads,
     * a read-back for their ids, and the opening posts.
     *
     * @param  array<array-key, mixed>  $payload
     * @return array<int, Thread> the threads written, most recently bumped first
     */
    public function importThreads(Board $board, array $payload, ?int $limit = null): array
    {
        $stubs = $this->stubs($payload);

        usort($stubs, fn (array $a, array $b): int => $this->bumpedAt($b) <=> $this->bumpedAt($a));

        $syncedAt = Date::now();

        /**
         * A null limit takes the catalog whole, which is the normal case.
         * `catalog.json` is every thread on the board in one response, so
         * truncating it drops threads for no saving — the request has already
         * been made and paid for at the rate limit. The cap exists for
         * development, where a short list is easier to work with.
         */
        $selected = $limit === null ? $stubs : array_slice($stubs, 0, max($limit, 0));

        /**
         * Keyed by post number, because one statement cannot touch a row twice
         * and the last stub for a number wins, as it did when each was written
         * in turn.
         *
         * @var array<int, array<string, mixed>> $rows
         */
        $rows = [];

        /** @var array<int, array<string, mixed>> $opening */
        $opening = [];

        foreach ($selected as $stub) {
            $no = $this->int($stub, 'no');

            if ($no === 0) {
                continue;
            }

            $subject = $this->decode($this->string($stub, 'sub'));

            $rows[$no] = [
                'board_id' => $board->id,
                'no' => $no,
                'subject' => $subject === '' ? null : $subject,
                'sticky' => $this->bool($stub, 'sticky'),
                'closed' => $this->bool($stub, 'closed'),
                'replies_count' => $this->int($stub, 'replies'),
                'images_count' => $this->int($stub, 'images'),
                'posted_at' => Date::createFromTimestamp($this->int($stub, 'time'), 'UTC'),
                'bumped_at' => Date::createFromTimestamp($this->bumpedAt($stub), 'UTC'),
                'synced_at' => $syncedAt,
            ];

            $opening[$no] = $stub;
        }

        foreach (array_chunk(array_values($rows), self::CHUNK) as $chunk) {
            Thread::query()->upsert($chunk, ['board_id', 'no'], [
                'subject', 'sticky', 'closed', 'replies_count', 'images_count',
                'posted_at', 'bumped_at', 'synced_at',
            ]);
        }

        /** @var array<int, Thread> $stored */
        $stored = [];

        foreach (array_chunk(array_keys($rows), self::CHUNK) as $numbers) {
            $found = Thread::query()->where('board_id', $board->id)->whereIn('no', $numbers)->get();

            foreach ($found as $thread) {
                $stored[$thread->no] = $thread;
            }
        }

        /**
         * The catalog stub *is* the opening post — it carries `com`,
         * `sub` and the whole media group, not just thread statistics — so
         * it is written as one.
         *
         * Without this a catalog sync produced threads with no post behind
         * them: no title beyond the post number, no excerpt, no image.
         * Only threads that had also had their full page fetched rendered
         * as anything, which is why nearly every board looked empty.
         *
         * `posts_synced_at` stays unset. This is the OP and nothing else;
         * the replies still need the thread endpoint, and that flag is
         * what records the difference.
         */
        $posts = [];
        $threads = [];

        foreach ($opening as $no => $stub) {
            if (! isset($stored[$no])) {
                continue;
            }

            $threads[] = $stored[$no];

            $post = $this->postRow($stored[$no]->id, $stub);

            if ($post !== null) {
                $posts[] = $post;
            }
        }

        $this->upsertPosts($posts);

        return $threads;
    }

    /**
     * Delete this board's threads that a whole-board catalog no longer lists.
     *
     * Only ever called with a `200` catalog that a thread limit did not cut
     * short: that response lists every thread the board has, so absence from it
     * is proof, where absence from anything else is just a request that did
     * not answer. It exists because the database is small, and a dead thread
     * is a row nobody can reach from the board.
     *
     * Two kinds of thread outlive the catalog. One someone bookmarked is
     * something an anon asked to keep, and one with a post written here
     * (`posts.user_id` set) holds local Clover activity that exists nowhere
     * upstream. Everything under a deleted thread — posts, bookmarks, reads —
     * goes with it through the foreign keys.
     *
     * A payload that lists no threads prunes nothing. A live board is never
     * empty, so that is a response to distrust rather than to act on.
     *
     * @param  array<array-key, mixed>  $payload
     * @return int the number of threads deleted
     */
    public function pruneThreads(Board $board, array $payload): int
    {
        $listed = array_values(array_filter(array_map(
            fn (array $stub): int => $this->int($stub, 'no'),
            $this->stubs($payload),
        )));

        if ($listed === []) {
            return 0;
        }

        return Thread::query()
            ->where('board_id', $board->id)
            ->whereNotIn('no', $listed)
            ->whereDoesntHave('bookmarks')
            ->whereDoesntHave('posts', fn (Builder $posts) => $posts->whereNotNull('user_id'))
            ->delete();
    }

    /**
     * Upsert every post on a thread page, and stamp the thread as fully synced.
     *
     * Posts are flat upstream: `resto` is 0 for the OP and the thread number
     * for every reply, and nesting does not exist. What nesting the interface
     * shows is derived from the quoted post numbers the parser pulls out.
     *
     * @param  array<array-key, mixed>  $payload
     * @return int the number of posts written
     */
    public function importPosts(Thread $thread, array $payload): int
    {
        $rows = [];

        foreach ($this->rows($payload, 'posts') as $row) {
            $post = $this->postRow($thread->id, $row);

            if ($post !== null) {
                $rows[$post['no']] = $post;
            }
        }

        $this->upsertPosts(array_values($rows));

        $thread->forceFill(['posts_synced_at' => Date::now()])->save();

        return count($rows);
    }

    /**
     * Every thread stub in a `catalog.json` payload, in the order it arrived.
     *
     * @param  array<array-key, mixed>  $payload
     * @return array<int, array<string, mixed>>
     */
    private function stubs(array $payload): array
    {
        $stubs = [];

        foreach ($payload as $page) {
            if (! is_array($page)) {
                continue;
            }

            foreach ($this->rows($page, 'threads') as $stub) {
                $stubs[] = $stub;
            }
        }

        return $stubs;
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     */
    private function upsertPosts(array $rows): void
    {
        foreach (array_chunk($rows, self::CHUNK) as $chunk) {
            Post::query()->upsert($chunk, ['thread_id', 'no'], self::POST_COLUMNS);
        }
    }

    /**
     * One post, from either a thread page or a catalog stub, as a row.
     *
     * The two payloads carry the same field names for everything a post is
     * made of — `no`, `com`, `name`, `trip`, `capcode`, `time` and the whole
     * media group — so the same mapping serves both. That is what lets a
     * catalog sync produce readable threads without fetching a single thread
     * page.
     *
     * Null for a row with no post number, and for a number in the range
     * Clover allocates to its own replies (`LocalPostNumbers`). Upstream's
     * sequence is nowhere near that range, so the second case does not occur;
     * it is here so the guarantee does not rest on upstream's numbering: a post
     * written on Clover is never the target of an upsert.
     *
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>|null
     */
    private function postRow(int $threadId, array $row): ?array
    {
        $no = $this->int($row, 'no');

        if ($no === 0 || LocalPostNumbers::isLocal($no)) {
            return null;
        }

        $comment = $this->parser->parse($this->nullableString($row, 'com'));

        return [
            'thread_id' => $threadId,
            'no' => $no,
            'is_op' => $this->int($row, 'resto') === 0,
            'author' => $this->decode($this->string($row, 'name', 'Anonymous')),
            'tripcode' => $this->nullableString($row, 'trip'),
            'capcode' => $this->nullableString($row, 'capcode'),
            'body' => $comment['body'],
            /** What the `array` cast would have encoded; `upsert` does not cast. */
            'quotes' => json_encode($comment['quotes'], JSON_THROW_ON_ERROR),
            'posted_at' => Date::createFromTimestamp($this->int($row, 'time'), 'UTC'),
            ...$this->media($row),
        ];
    }

    /**
     * An attachment: what it was called, how big it is, and the id its file
     * is addressed by on the CDN.
     *
     * `tim` is the load-bearing one and the original filename is not. 4chan
     * stores the file under its own id, so `{tim}{ext}` builds the image URL
     * and `{tim}s.jpg` the thumbnail, while `filename` is only ever the label
     * an anon sees.
     *
     * A post whose file upstream has deleted carries no media at all rather
     * than an id that resolves to nothing. `filedeleted` is the flag for it,
     * and honouring it is the difference between an empty post and a broken
     * image on every thread old enough to have been moderated.
     *
     * @param  array<string, mixed>  $row
     * @return array<string, int|string|bool|null>
     */
    private function media(array $row): array
    {
        $filename = $this->nullableString($row, 'filename');
        $tim = $this->int($row, 'tim') ?: null;

        if ($filename === null || $tim === null || $this->bool($row, 'filedeleted')) {
            return [
                'media_filename' => null,
                'media_extension' => null,
                'media_tim' => null,
                'media_width' => null,
                'media_height' => null,
                'media_thumb_width' => null,
                'media_thumb_height' => null,
                'media_size' => null,
                'media_spoiler' => false,
            ];
        }

        return [
            'media_filename' => $filename,
            'media_extension' => $this->nullableString($row, 'ext'),
            'media_tim' => $tim,
            'media_width' => $this->int($row, 'w') ?: null,
            'media_height' => $this->int($row, 'h') ?: null,
            'media_thumb_width' => $this->int($row, 'tn_w') ?: null,
            'media_thumb_height' => $this->int($row, 'tn_h') ?: null,
            'media_size' => $this->int($row, 'fsize') ?: null,
            'media_spoiler' => $this->bool($row, 'spoiler'),
        ];
    }

    /**
     * `last_modified` is the bump time and drives board ordering. A thread
     * that has never been replied to does not always carry one, so its own
     * post time stands in.
     *
     * @param  array<string, mixed>  $stub
     */
    private function bumpedAt(array $stub): int
    {
        return $this->int($stub, 'last_modified') ?: $this->int($stub, 'time');
    }

    /**
     * The flat slug-to-category lookup, inverted from the configured grouping.
     *
     * @return array<string, string>
     */
    private function categoryLookup(): array
    {
        /** @var array<string, array<int, string>> $map */
        $map = config('clover.categories.map', []);

        $lookup = [];

        foreach ($map as $category => $slugs) {
            foreach ($slugs as $slug) {
                $lookup[$slug] = $category;
            }
        }

        return $lookup;
    }

    private function defaultCategory(): string
    {
        /** @var string $default */
        $default = config('clover.categories.default', 'Other');

        return $default;
    }

    /**
     * The list under a key, with anything that is not a keyed row discarded.
     *
     * @param  array<array-key, mixed>  $payload
     * @return array<int, array<string, mixed>>
     */
    private function rows(array $payload, string $key): array
    {
        $rows = $payload[$key] ?? null;

        if (! is_array($rows)) {
            return [];
        }

        /** @var array<int, array<string, mixed>> $keyed */
        $keyed = array_values(array_filter($rows, is_array(...)));

        return $keyed;
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function string(array $row, string $key, string $default = ''): string
    {
        $value = $row[$key] ?? null;

        return is_string($value) || is_int($value) ? (string) $value : $default;
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function nullableString(array $row, string $key): ?string
    {
        $value = $this->string($row, $key);

        return $value === '' ? null : $value;
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function int(array $row, string $key): int
    {
        $value = $row[$key] ?? null;

        return is_numeric($value) ? (int) $value : 0;
    }

    /**
     * Upstream's booleans are `1` and absent, never `false`.
     *
     * @param  array<string, mixed>  $row
     */
    private function bool(array $row, string $key): bool
    {
        return $this->int($row, $key) === 1;
    }

    /**
     * Board titles, descriptions, subjects and names arrive HTML-escaped.
     * Everything downstream renders as text, so they are decoded once here
     * rather than escaped again at every render site.
     */
    private function decode(string $value): string
    {
        return html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }
}
