<?php

declare(strict_types=1);

namespace App\Services\FourChan;

use App\Models\Board;
use App\Models\Post;
use App\Models\Thread;
use Illuminate\Support\Facades\Date;

/**
 * Turns a decoded upstream payload into rows.
 *
 * Kept apart from `Client` so the mapping can be tested against a recorded
 * response without a request, and apart from the command so the command is
 * only orchestration and reporting. Every method here writes; none of them
 * delete. A board or thread that has stopped appearing upstream keeps its rows
 * — the sync has no way to tell "deleted" from "this request failed", and
 * guessing wrong empties the site.
 */
final class Importer
{
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
     * @param  array<array-key, mixed>  $payload
     * @return array<int, Thread> the threads written, most recently bumped first
     */
    public function importThreads(Board $board, array $payload, ?int $limit = null): array
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

        usort($stubs, fn (array $a, array $b): int => $this->bumpedAt($b) <=> $this->bumpedAt($a));

        $syncedAt = Date::now();
        $threads = [];

        /**
         * A null limit takes the catalog whole, which is the normal case.
         * `catalog.json` is every thread on the board in one response, so
         * truncating it drops threads for no saving — the request has already
         * been made and paid for at the rate limit. The cap exists for
         * development, where a short list is easier to work with.
         */
        $selected = $limit === null ? $stubs : array_slice($stubs, 0, max($limit, 0));

        foreach ($selected as $stub) {
            $no = $this->int($stub, 'no');

            if ($no === 0) {
                continue;
            }

            $subject = $this->decode($this->string($stub, 'sub'));

            $thread = Thread::query()->updateOrCreate(
                ['board_id' => $board->id, 'no' => $no],
                [
                    'subject' => $subject === '' ? null : $subject,
                    'sticky' => $this->bool($stub, 'sticky'),
                    'closed' => $this->bool($stub, 'closed'),
                    'replies_count' => $this->int($stub, 'replies'),
                    'images_count' => $this->int($stub, 'images'),
                    'posted_at' => Date::createFromTimestamp($this->int($stub, 'time'), 'UTC'),
                    'bumped_at' => Date::createFromTimestamp($this->bumpedAt($stub), 'UTC'),
                    'synced_at' => $syncedAt,
                ],
            );

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
            $this->upsertPost($thread, $stub);

            $threads[] = $thread;
        }

        return $threads;
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
        $written = 0;

        foreach ($this->rows($payload, 'posts') as $row) {
            $no = $this->int($row, 'no');

            if ($no === 0) {
                continue;
            }

            $this->upsertPost($thread, $row);

            $written++;
        }

        $thread->forceFill(['posts_synced_at' => Date::now()])->save();

        return $written;
    }

    /**
     * Write one post, from either a thread page or a catalog stub.
     *
     * The two payloads carry the same field names for everything a post is
     * made of — `no`, `com`, `name`, `trip`, `capcode`, `time` and the whole
     * media group — so the same writer serves both. That is what lets a
     * catalog sync produce readable threads without fetching a single thread
     * page.
     *
     * @param  array<string, mixed>  $row
     */
    private function upsertPost(Thread $thread, array $row): void
    {
        $comment = $this->parser->parse($this->nullableString($row, 'com'));

        Post::query()->updateOrCreate(
            ['thread_id' => $thread->id, 'no' => $this->int($row, 'no')],
            [
                'is_op' => $this->int($row, 'resto') === 0,
                'author' => $this->decode($this->string($row, 'name', 'Anonymous')),
                'tripcode' => $this->nullableString($row, 'trip'),
                'capcode' => $this->nullableString($row, 'capcode'),
                'body' => $comment['body'],
                'quotes' => $comment['quotes'],
                'posted_at' => Date::createFromTimestamp($this->int($row, 'time'), 'UTC'),
                ...$this->media($row),
            ],
        );
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
