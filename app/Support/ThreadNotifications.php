<?php

declare(strict_types=1);

namespace App\Support;

use App\Http\Resources\RelativeTime;
use App\Models\Bookmark;
use App\Models\Post;
use App\Models\Thread;
use App\Models\ThreadRead;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * New replies in threads this anon is in.
 *
 * ## Why this is not "someone replied to you"
 *
 * Nobody can be notified personally here, and that is the product working
 * rather than a gap in it: a post carries no identity, so there is no author
 * to address a reply to and no inbox to deliver it into. The screen this
 * replaces said "Replies and janitor actions appear here", which named two
 * things that do not exist — there is no janitor queue, and no reply is
 * addressed to an account.
 *
 * What *is* real, and derivable entirely from rows this application already
 * has, is the thread. An anon who saved a thread or posted in one has said
 * they care about it; the thread has posts; some of those posts arrived after
 * they last looked. That is a notification — it just belongs to the thread
 * rather than to them.
 *
 * ## The watermark
 *
 * Per thread, the latest of: when they last read it, when they saved it, and
 * when they last posted in it. Anything after that is new to them. Their own
 * posts never count as new, because being told about your own writing is the
 * same defect as an unread badge that is always on.
 *
 * Ingested posts have no `user_id`, so almost everything upstream counts —
 * which is the point. The mirror is where the replies actually come from.
 */
final class ThreadNotifications
{
    /**
     * How many followed threads are examined. A bound rather than a page: the
     * counting query composes one clause per thread, and an anon who has saved
     * a thousand threads should not build a thousand-clause `where`.
     */
    private const FOLLOWED = 40;

    /**
     * @return array<int, array<string, mixed>>
     */
    public static function for(?User $user, bool $showsMatureBoards, int $limit = 20): array
    {
        if ($user === null) {
            return [];
        }

        $watermarks = self::watermarks($user, $showsMatureBoards);

        if ($watermarks->isEmpty()) {
            return [];
        }

        $threads = Thread::query()
            ->whereIn('id', $watermarks->keys())
            ->with('board')
            ->get()
            ->keyBy('id');

        $arrivals = self::arrivals($user, $watermarks);

        return $watermarks->keys()
            ->map(function (int $threadId) use ($threads, $arrivals, $watermarks): ?array {
                $thread = $threads->get($threadId);
                $arrival = $arrivals->get($threadId);

                if ($thread === null || $arrival === null) {
                    return null;
                }

                return [
                    'threadId' => $thread->id,
                    'no' => $thread->no,
                    'board' => $thread->board->displaySlug(),
                    'title' => $thread->displayTitle(),
                    'replies' => $arrival['count'],
                    'reason' => $watermarks[$threadId]['reason'],
                    'time' => RelativeTime::since($arrival['latest']),
                    'at' => $arrival['latest']->getTimestamp(),
                ];
            })
            ->filter()
            ->sortByDesc('at')
            ->take($limit)
            /* `at` is the sort key, not part of the contract. */
            ->map(fn (array $entry): array => collect($entry)->except('at')->all())
            ->values()
            ->all();
    }

    /**
     * How many of these an anon has not seen, for the header's badge.
     *
     * The badge used to be a dot painted unconditionally beside a count that
     * was however many rows the menu happened to preview — on at all times,
     * including for an account that had done nothing. A number that is always
     * the same number is not a count.
     */
    public static function countFor(?User $user, bool $showsMatureBoards): int
    {
        return count(self::for($user, $showsMatureBoards));
    }

    /**
     * Threads this anon follows, each with the moment after which a post is
     * new to them.
     *
     * @return Collection<int, array{reason: string, since: CarbonImmutable}>
     */
    private static function watermarks(User $user, bool $showsMatureBoards): Collection
    {
        $visible = Thread::query()->onVisibleBoard($showsMatureBoards)->select('id');

        /** @var Collection<int, array{reason: string, since: CarbonImmutable}> $followed */
        $followed = collect();

        $remember = function (int $threadId, string $reason, ?CarbonImmutable $since) use ($followed): void {
            if ($since === null) {
                return;
            }

            $existing = $followed->get($threadId);

            /* The latest watermark wins, and so does the reason attached to
               it: an anon who saved a thread and then posted in it is in it
               because they posted. */
            if ($existing === null || $since->greaterThan($existing['since'])) {
                $followed->put($threadId, ['reason' => $reason, 'since' => $since]);
            }
        };

        Bookmark::query()
            ->where('user_id', $user->id)
            ->whereIn('thread_id', $visible)
            ->latest()
            ->limit(self::FOLLOWED)
            ->get()
            ->each(fn (Bookmark $bookmark) => $remember($bookmark->thread_id, 'saved', $bookmark->created_at));

        Post::query()
            ->where('user_id', $user->id)
            ->whereIn('thread_id', $visible)
            ->orderByDesc('posted_at')
            ->limit(self::FOLLOWED)
            ->get()
            ->each(fn (Post $post) => $remember($post->thread_id, 'posted', $post->posted_at));

        /* Reading a thread is not a reason to follow it — an anon who opened
           one link should not be signed up to it forever — but it *is* the
           moment they last saw it, so it moves the watermark on threads they
           already follow. */
        ThreadRead::query()
            ->where('user_id', $user->id)
            ->whereIn('thread_id', $followed->keys())
            ->get()
            ->each(function (ThreadRead $read) use ($followed): void {
                $existing = $followed->get($read->thread_id);

                /* `last_read_at` is not nullable -- the row exists because
                   the thread was read -- so only the follow has to be checked
                   here. A read on a thread nothing else follows is not a
                   reason to follow it. */
                if ($existing !== null && $read->last_read_at->greaterThan($existing['since'])) {
                    $followed->put($read->thread_id, [
                        'reason' => $existing['reason'],
                        'since' => $read->last_read_at,
                    ]);
                }
            });

        return $followed;
    }

    /**
     * What arrived in each followed thread after its watermark.
     *
     * One query for every thread rather than one per thread: the watermark
     * differs per thread, so the clauses are OR'd together and grouped, and
     * `FOLLOWED` is what keeps that `where` a sane size.
     *
     * @param  Collection<int, array{reason: string, since: CarbonImmutable}>  $watermarks
     * @return Collection<int, array{count: int, latest: CarbonImmutable}>
     */
    private static function arrivals(User $user, Collection $watermarks): Collection
    {
        return Post::query()
            ->select('thread_id')
            ->selectRaw('count(*) as arrived')
            ->selectRaw('max(posted_at) as latest')
            /* Their own writing is never news to them.

               Mostly this cannot fire: an anon's latest post in a thread *is*
               that thread's watermark, so their writing sits on the line
               rather than after it. It fires when `FOLLOWED` truncates -- a
               reply in a quiet saved thread falls out of the window the
               watermark query reads, the watermark falls back to when the
               thread was saved, and their own reply is suddenly after it.
               `NotificationsTest` reaches that case deliberately, because the
               first version of that guard passed with this clause deleted. */
            ->where(fn (Builder $query) => $query
                ->whereNull('user_id')
                ->orWhere('user_id', '!=', $user->id))
            ->where(function (Builder $query) use ($watermarks): void {
                foreach ($watermarks as $threadId => $watermark) {
                    $query->orWhere(fn (Builder $clause) => $clause
                        ->where('thread_id', $threadId)
                        ->where('posted_at', '>', $watermark['since']));
                }
            })
            ->groupBy('thread_id')
            ->get()
            ->mapWithKeys(fn (Post $row): array => [
                (int) $row->thread_id => [
                    'count' => (int) $row->getAttribute('arrived'),
                    /* Read through a fresh model so the `posted_at` cast
                       applies: an aggregate comes back as a driver string, and
                       handing that to `RelativeTime::since()` is a TypeError
                       this codebase has already shipped once. */
                    'latest' => (new Post(['posted_at' => $row->getAttribute('latest')]))->posted_at,
                ],
            ]);
    }
}
