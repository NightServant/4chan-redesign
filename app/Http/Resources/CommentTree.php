<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Post;
use App\Models\Thread;
use Illuminate\Support\Collection;

/**
 * A thread's replies, nested, in the shape `Comment` declares.
 *
 * 4chan's posts are flat. `resto` is 0 on the OP and the thread number on
 * every reply, so upstream has exactly two levels and Clover's `Comment` type
 * is recursive. The nesting is therefore derived, here, from quotelinks: a
 * reply sits under the post it quotes.
 *
 * Real quote graphs are messy and this is where a naive implementation loses
 * posts. All four of the awkward cases are handled deliberately:
 *
 * - **Quotes nothing.** Common — a reply to the thread rather than to anyone.
 *   Top level.
 * - **Quotes a number this thread does not hold.** Also common: the OP itself,
 *   a post pruned before the sync ran, a cross-board link. Top level, because
 *   the parent it named is not here to sit under.
 * - **Quotes several posts.** Nests under the first quote that resolves. The
 *   full list survives in `quotes` regardless, which is what the interface
 *   renders as `>>58210441` references.
 * - **Cycles.** Two posts quoting each other, or a longer loop. The ancestor
 *   walk below refuses any parent that would close a loop, so the structure is
 *   acyclic by construction and cannot recurse forever.
 *
 * A reply that cannot be placed is placed at the top level. It is never
 * dropped: a reply missing from a thread is invisible, and an invisible bug is
 * the failure mode this project keeps paying for.
 */
final class CommentTree
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public static function for(Thread $thread): array
    {
        $posts = $thread->posts;

        $originalPost = $posts->firstWhere('is_op', true);

        return self::build(
            $posts->reject(fn (Post $post): bool => $post->is_op)->values(),
            $originalPost,
        );
    }

    /**
     * @param  Collection<int, Post>  $replies
     * @return array<int, array<string, mixed>>
     */
    public static function build(Collection $replies, ?Post $originalPost = null): array
    {
        /**
         * Chronological, then by post number. Post numbers are already a
         * monotonic per-board sequence upstream, so the second key only ever
         * settles ties — but it settles them the same way on every run, which
         * a thread with two posts in the same second needs.
         */
        $ordered = $replies->sortBy([['posted_at', 'asc'], ['no', 'asc']])->values();

        /** @var array<int, Post> $byNo */
        $byNo = [];

        foreach ($ordered as $post) {
            $byNo[$post->no] = $post;
        }

        /** @var array<int, int> $parentOf */
        $parentOf = [];

        /** @var array<int, array<int, int>> $childrenOf */
        $childrenOf = [];

        /** @var array<int, int> $roots */
        $roots = [];

        foreach ($ordered as $post) {
            $parent = self::parentFor($post, $byNo, $parentOf);

            if ($parent === null) {
                $roots[] = $post->no;

                continue;
            }

            $parentOf[$post->no] = $parent;
            $childrenOf[$parent][] = $post->no;
        }

        return self::nodes($roots, $byNo, $childrenOf, $originalPost?->tripcode);
    }

    /**
     * The post this reply nests under, or null for the top level.
     *
     * @param  array<int, Post>  $byNo
     * @param  array<int, int>  $parentOf
     */
    private static function parentFor(Post $post, array $byNo, array $parentOf): ?int
    {
        foreach ($post->quotes as $quoted) {
            $quoted = (int) $quoted;

            if ($quoted === $post->no || ! isset($byNo[$quoted])) {
                continue;
            }

            if (self::wouldCycle($post->no, $quoted, $parentOf)) {
                continue;
            }

            return $quoted;
        }

        return null;
    }

    /**
     * Whether hanging `$childNo` under `$candidate` would close a loop.
     *
     * Walks the candidate's ancestors. The `$seen` guard is belt and braces —
     * nothing acyclic is ever inserted, so a loop cannot already exist — but
     * it means a future change that inserts one is a wrong answer rather than
     * a hung request.
     *
     * @param  array<int, int>  $parentOf
     */
    private static function wouldCycle(int $childNo, int $candidate, array $parentOf): bool
    {
        /** @var array<int, true> $seen */
        $seen = [];

        $cursor = $candidate;

        while (true) {
            if ($cursor === $childNo || isset($seen[$cursor])) {
                return true;
            }

            $seen[$cursor] = true;

            if (! isset($parentOf[$cursor])) {
                return false;
            }

            $cursor = $parentOf[$cursor];
        }
    }

    /**
     * @param  array<int, int>  $numbers
     * @param  array<int, Post>  $byNo
     * @param  array<int, array<int, int>>  $childrenOf
     * @return array<int, array<string, mixed>>
     */
    private static function nodes(array $numbers, array $byNo, array $childrenOf, ?string $originalTripcode): array
    {
        $comments = [];

        foreach ($numbers as $no) {
            $post = $byNo[$no];

            $comments[] = [
                'no' => $post->no,
                'quotes' => array_values(array_map(intval(...), $post->quotes)),
                'author' => $post->author,
                'time' => RelativeTime::since($post->posted_at),
                'body' => $post->body,

                /** Clover's own votes, net of curses. */
                'blessings' => $post->blessings(),

                'op' => self::isOriginalAnon($post, $originalTripcode),

                /**
                 * Replies carry files as often as the OP does. Rendering the
                 * thread without them drops most of what is actually on a
                 * board like /wg/ or /3/.
                 */
                'media' => AttachmentResource::for($post, request()),

                'replies' => self::nodes($childrenOf[$no] ?? [], $byNo, $childrenOf, $originalTripcode),
            ];
        }

        return $comments;
    }

    /**
     * Whether this reply was written by the anon who opened the thread.
     *
     * The only evidence 4chan publishes is a tripcode, and almost nobody uses
     * one. Where the OP signed and a reply carries the same signature, the
     * claim is upstream's own; where either is unsigned the answer is false,
     * because the board genuinely does not say and guessing would be
     * fabricating an identity onto an anonymous post.
     */
    private static function isOriginalAnon(Post $post, ?string $originalTripcode): bool
    {
        return filled($originalTripcode) && $post->tripcode === $originalTripcode;
    }
}
