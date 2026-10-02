<?php

declare(strict_types=1);

namespace App\Services\FourChan;

use App\Models\Board;
use App\Models\Thread;
use Closure;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Refetch a board or a thread from 4chan when an anon opens it and what is
 * stored has gone stale.
 *
 * This is the one place a page request reaches upstream. Board and thread
 * pages used to read only what `clover:sync` had written; on a deployment
 * where the sync runs every half hour that leaves a thread up to half an hour
 * behind the one it mirrors, so those two pages now catch up on open. Home,
 * the feed and search stay on the stored copy and are fed by the sweep.
 *
 * Nothing here may make a page worse than the stored copy would have been. A
 * failure, a timeout, a `404`, a held lock: all of them mean the page renders
 * what is stored, and none of them is allowed to throw. The request is also
 * kept short, because an anon is waiting on it.
 *
 * Every request still goes through `Client`, which paces upstream to one a
 * second across every process through the cache, so a burst of page views
 * cannot add up to more than 4chan allows — it can only queue.
 *
 * Off unless `clover.live_fetch` is set, so local development and the test
 * suite never reach the network by accident.
 */
final class LiveFetch
{
    /** A board's catalog is refetched at most this often. */
    public const BOARD_SECONDS = 60;

    /** A thread's posts are refetched at most this often. */
    public const THREAD_SECONDS = 30;

    /** Long enough for a slow answer, short enough that an anon does not stare at a spinner. */
    private const TIMEOUT_SECONDS = 3;

    /** How long a crashed holder can keep others out; a refresh is a few seconds. */
    private const LOCK_SECONDS = 15;

    private const KEY = 'clover.live.';

    public function __construct(
        private readonly Client $client,
        private readonly Importer $importer,
    ) {}

    /**
     * Bring a board's threads up to date, if its catalog is stale.
     *
     * Imports the catalog and prunes whatever it no longer lists, by the same
     * rule as the sync: only a `200` that was taken whole is proof a thread is
     * gone, so a `304`, a `404` or a failure leaves the stored rows alone.
     */
    public function board(Board $board): void
    {
        $this->refresh('board.'.$board->slug, self::BOARD_SECONDS, function () use ($board): void {
            $result = $this->client->catalog($board->slug, self::TIMEOUT_SECONDS);

            if (! $result->isFetched()) {
                return;
            }

            $limit = config('clover.sync.threads_per_board');
            $limit = is_numeric($limit) ? (int) $limit : null;

            $this->importer->importThreads($board, $result->data, $limit);

            if ($limit === null) {
                $this->importer->pruneThreads($board, $result->data);
            }

            $this->client->confirm($result);
        });
    }

    /**
     * Bring a thread's posts up to date, if they were last synced more than
     * half a minute ago or never.
     */
    public function thread(Board $board, Thread $thread): void
    {
        $syncedAt = $thread->posts_synced_at;

        if ($syncedAt !== null && $syncedAt->gt(now()->subSeconds(self::THREAD_SECONDS))) {
            return;
        }

        $this->refresh('thread.'.$thread->id, self::THREAD_SECONDS, function () use ($board, $thread): void {
            $result = $this->client->thread($board->slug, $thread->no, self::TIMEOUT_SECONDS);

            if ($result->isFetched()) {
                $this->importer->importPosts($thread, $result->data);
                $this->client->confirm($result);
            }
        });
    }

    /**
     * Run one refresh at most once per window, and never two at once.
     *
     * The window is a cache key written before the request, so it also covers
     * a request that fails: a thread that has gone `404` upstream and is kept
     * because someone bookmarked it would otherwise cost an upstream request on
     * every view, and an outage would cost every view the full timeout. The
     * lock is non-blocking — a second visitor is not made to wait on the first,
     * they are shown what is stored.
     *
     * @param  Closure(): void  $fetch
     */
    private function refresh(string $name, int $windowSeconds, Closure $fetch): void
    {
        if (! config('clover.live_fetch')) {
            return;
        }

        $attempted = self::KEY.$name;

        if (Cache::has($attempted)) {
            return;
        }

        $lock = Cache::lock(self::KEY.'lock.'.$name, self::LOCK_SECONDS);

        if (! $lock->get()) {
            return;
        }

        try {
            /**
             * Claims the window, and fails if someone else already did: they
             * may have finished between the check above and taking the lock.
             */
            if (! Cache::add($attempted, true, $windowSeconds)) {
                return;
            }

            $fetch();
        } catch (Throwable $e) {
            Log::warning("Live fetch of [{$name}] failed; serving the stored copy.", [
                'exception' => $e::class,
                'message' => $e->getMessage(),
            ]);
        } finally {
            $lock->release();
        }
    }
}
