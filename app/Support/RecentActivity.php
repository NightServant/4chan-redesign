<?php

declare(strict_types=1);

namespace App\Support;

use App\Http\Resources\RelativeTime;
use App\Models\Bookmark;
use App\Models\Post;
use App\Models\Thread;
use App\Models\User;
use Illuminate\Support\Arr;

/**
 * What an anon has been doing.
 *
 * Read by three surfaces — the account overview, the feed rail and the
 * header's notification menu — which is why it lives here rather than in a
 * controller. Three copies of this derivation would drift.
 *
 * The fixture it replaces mixed things done *to* an anon with things they did:
 * "Anonymous replied to your post", "Your report was actioned". Neither has a
 * source. There is no reporting system, and a reply is not addressed to an
 * account — the product's whole claim is that a post carries no identity to
 * address. What is real is an anon's own record, so that is what this reports.
 */
final class RecentActivity
{
    /**
     * @return array<int, array<string, string>>
     */
    public static function for(?User $user, bool $showsMatureBoards, int $limit = 6): array
    {
        if ($user === null) {
            return [];
        }

        $visible = Thread::query()->onVisibleBoard($showsMatureBoards)->select('id');

        $posts = Post::query()
            ->where('user_id', $user->id)
            ->whereIn('thread_id', $visible)
            ->with('thread.board')
            ->orderByDesc('posted_at')
            ->limit($limit)
            ->get()
            ->map(fn (Post $post): array => [
                'icon' => 'message-square',
                'text' => $post->is_op
                    ? "You started a thread in {$post->thread->board->displaySlug()}"
                    : "You replied in {$post->thread->board->displaySlug()}",
                'time' => RelativeTime::since($post->posted_at),
                'at' => $post->posted_at->getTimestamp(),
            ]);

        $saves = Bookmark::query()
            ->where('user_id', $user->id)
            ->whereIn('thread_id', $visible)
            ->with('thread.board')
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get()
            ->map(fn (Bookmark $bookmark): array => [
                'icon' => 'bookmark',
                'text' => "You saved a thread in {$bookmark->thread->board->displaySlug()}",
                'time' => RelativeTime::since($bookmark->created_at),
                'at' => $bookmark->created_at?->getTimestamp() ?? 0,
            ]);

        return $posts->concat($saves)
            ->sortByDesc('at')
            ->take($limit)
            /* `at` is the sort key, not part of the contract. */
            ->map(fn (array $entry): array => Arr::except($entry, 'at'))
            ->values()
            ->all();
    }
}
