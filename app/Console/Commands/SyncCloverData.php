<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Board;
use App\Models\Thread;
use App\Services\FourChan\ApiResult;
use App\Services\FourChan\Client;
use App\Services\FourChan\Importer;
use App\Services\FourChan\UpstreamException;
use App\Support\RoutableBoards;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Collection;

/**
 * Pull boards, threads and — on request — posts from 4chan's JSON API.
 *
 * Every request is rate-limited to one a second by the client, so a full run
 * is minutes long and mostly spent waiting. That shapes two things here: the
 * command reports each board as it finishes rather than at the end, and a
 * board that fails is stepped over rather than aborting the run. A sync that
 * dies on the fortieth of seventy-seven boards would otherwise leave the site
 * with a board list that is half a list.
 *
 * Nothing is ever deleted. A board or thread missing from a response might be
 * gone upstream or might be a request that failed in a way we misread, and
 * only one of those is worth acting on.
 */
#[Signature('clover:sync
    {--board=* : Board slugs to sync, e.g. --board=g --board=3. Defaults to config, then to every board.}
    {--with-posts : Also fetch each thread page and store its posts.}
    {--limit= : Threads per board. Defaults to clover.sync.threads_per_board.}
    {--post-limit= : Threads per board whose full page is fetched. Defaults to --limit.}')]
#[Description("Sync boards, threads and posts from 4chan's read-only JSON API")]
class SyncCloverData extends Command
{
    public function handle(Client $client, Importer $importer): int
    {
        $this->components->info('Syncing from '.(string) config('clover.api.base_url').', one request a second.');

        if (! $this->syncBoards($client, $importer)) {
            return self::FAILURE;
        }

        $boards = $this->targetBoards();

        if ($boards->isEmpty()) {
            $this->components->warn('No boards to sync.');

            return self::SUCCESS;
        }

        $failures = 0;

        foreach ($boards as $board) {
            $failures += $this->syncBoard($client, $importer, $board) ? 0 : 1;
        }

        $this->newLine();
        $this->components->info(sprintf(
            '%d board(s) synced, %d thread(s) stored.',
            $boards->count() - $failures,
            Thread::query()->whereIn('board_id', $boards->modelKeys())->count(),
        ));

        /**
         * A board that answered 404 is not a failure — that is upstream saying
         * the board is gone. Only a board we could not read at all is, because
         * a scheduled run that quietly half-worked should show up as red.
         */
        return $failures === 0 ? self::SUCCESS : self::FAILURE;
    }

    /**
     * Upsert the board list, and drop the routing cache if the set changed.
     *
     * Returns false only when the board list could not be read at all, which
     * is fatal: every later step needs it, and the rows we already have are
     * better than rows built on a response we did not get.
     */
    private function syncBoards(Client $client, Importer $importer): bool
    {
        $before = $this->slugs();

        try {
            $result = $client->boards();
        } catch (UpstreamException $e) {
            $this->components->error($e->getMessage());

            return false;
        }

        if ($result->isMissing()) {
            $this->components->error('boards.json is gone upstream. Keeping the boards already stored.');

            return false;
        }

        if ($result->isUnchanged()) {
            $this->components->twoColumnDetail('boards.json', '<fg=yellow>unchanged</>');

            return true;
        }

        $slugs = $importer->importBoards($result->data);

        $this->components->twoColumnDetail('boards.json', count($slugs).' boards');

        $after = $this->slugs();

        if ($after !== $before) {
            /**
             * `/{board}` is constrained by a list cached forever, so a board
             * synced for the first time is unroutable until this is called.
             * Nothing else expires it.
             */
            RoutableBoards::forget();

            $this->components->twoColumnDetail('routable boards', count($after).' slugs, cache cleared');
        }

        return true;
    }

    /**
     * One board: its catalog, and optionally the full page of each thread.
     */
    private function syncBoard(Client $client, Importer $importer, Board $board): bool
    {
        try {
            $catalog = $client->catalog($board->slug);
        } catch (UpstreamException $e) {
            $this->components->twoColumnDetail($board->displaySlug(), '<fg=red>'.$e->getMessage().'</>');

            return false;
        }

        if ($catalog->isMissing()) {
            /** Retired upstream. Its threads stay: they were real when we read them. */
            $this->components->twoColumnDetail($board->displaySlug(), '<fg=yellow>gone upstream (404), rows kept</>');

            return true;
        }

        if ($catalog->isUnchanged()) {
            $this->components->twoColumnDetail($board->displaySlug(), '<fg=yellow>unchanged</>');

            return $this->syncPosts($client, $importer, $board);
        }

        $threads = $importer->importThreads($board, $catalog->data, $this->threadLimit());

        $this->components->twoColumnDetail($board->displaySlug(), count($threads).' threads');

        return $this->syncPosts($client, $importer, $board);
    }

    /**
     * Fetch the full page of the board's most recently bumped threads.
     *
     * This is the expensive half of a sync — one request per thread — so it is
     * opt-in, capped separately, and shows a progress bar: at a request a
     * second, thirty threads is half a minute of a command that would
     * otherwise look wedged.
     */
    private function syncPosts(Client $client, Importer $importer, Board $board): bool
    {
        if (! $this->option('with-posts')) {
            return true;
        }

        $threads = $board->threads()
            ->orderByDesc('bumped_at')
            ->limit($this->postLimit())
            ->get();

        if ($threads->isEmpty()) {
            return true;
        }

        $failures = 0;
        $posts = 0;

        $bar = $this->output->createProgressBar($threads->count());
        $bar->start();

        foreach ($threads as $thread) {
            $result = $this->threadPage($client, $board, $thread);

            if ($result === null) {
                $failures++;
            } elseif ($result->isFetched()) {
                $posts += $importer->importPosts($thread, $result->data);
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();

        $this->components->twoColumnDetail(
            $board->displaySlug().' posts',
            $failures === 0 ? $posts.' posts' : "<fg=red>{$posts} posts, {$failures} thread(s) unreadable</>",
        );

        return $failures === 0;
    }

    /**
     * Null when the thread could not be read; a 404 is an answer, not a null —
     * threads fall off the board constantly and the rows we hold stay valid.
     */
    private function threadPage(Client $client, Board $board, Thread $thread): ?ApiResult
    {
        try {
            return $client->thread($board->slug, $thread->no);
        } catch (UpstreamException) {
            return null;
        }
    }

    /**
     * @return Collection<int, Board>
     */
    private function targetBoards(): Collection
    {
        /** @var array<int, string> $requested */
        $requested = $this->option('board');

        if ($requested === []) {
            /** @var array<int, string> $requested */
            $requested = config('clover.sync.boards', []);
        }

        $query = Board::query()->orderBy('slug');

        if ($requested !== []) {
            $query->whereIn('slug', $requested);
        }

        /** @var Collection<int, Board> $boards */
        $boards = $query->get();

        foreach (array_diff($requested, $boards->pluck('slug')->all()) as $unknown) {
            $this->components->warn("No board [{$unknown}] — it is not in the board list upstream returned.");
        }

        return $boards;
    }

    private function threadLimit(): ?int
    {
        $limit = $this->option('limit');

        if (is_numeric($limit)) {
            return (int) $limit;
        }

        /**
         * Null means the whole catalog, and that is the configured default.
         * One request already returns every thread on the board, so a cap only
         * throws away threads that have been fetched and paid for.
         */
        $configured = config('clover.sync.threads_per_board');

        return is_numeric($configured) ? (int) $configured : null;
    }

    /**
     * How many threads per board get their full page fetched.
     *
     * Always a number, and deliberately not `threadLimit()`. The two look
     * alike and cost nothing alike: the thread limit can be null because one
     * `catalog.json` request already returns every thread on the board, so a
     * cap there only discards rows already paid for. A post limit of null
     * would mean a request *per thread* — against the eleven thousand threads
     * a full sync stores, better than three hours at the rate limit.
     *
     * It used to delegate here, which was a bug rather than a decision: when
     * the thread limit gained its null case, this kept declaring `int` and
     * returned it anyway, so `--with-posts` type-errored unless `--post-limit`
     * was passed explicitly.
     */
    private function postLimit(): int
    {
        $limit = $this->option('post-limit');

        if (is_numeric($limit)) {
            return (int) $limit;
        }

        return (int) config('clover.sync.threads_with_posts', 10);
    }

    /**
     * @return array<int, string>
     */
    private function slugs(): array
    {
        /** @var array<int, string> $slugs */
        $slugs = Board::query()->orderBy('slug')->pluck('slug')->all();

        return $slugs;
    }
}
