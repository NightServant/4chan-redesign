<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Board;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A trending entry, in the shape `TrendingTag` declares.
 *
 * The type kept its `{ tag, posts }` shape but not its meaning. 4chan has no
 * tags — no topic field, no hashtags, nothing to aggregate — so a fixture full
 * of `risc-v` and `homelab` could only have been reproduced by inventing them
 * on every render. The busiest boards are the real quantity closest to what
 * the strip was showing, so `tag` is a board's display slug and `posts` is how
 * many posts that board is carrying.
 *
 * The count is replies plus the threads themselves: an OP is a post, and the
 * field is `posts`.
 */
final class TrendingTagResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var Board $board */
        $board = $this->resource;

        return [
            'tag' => $board->displaySlug(),
            'posts' => number_format(self::postCount($board)).' posts',
        ];
    }

    /**
     * Expects `withSum` and `withCount` to have run. Falls back to querying
     * rather than reporting zero, so a resource built from a bare model is
     * merely slow instead of wrong.
     */
    private static function postCount(Board $board): int
    {
        $replies = $board->getAttribute('threads_sum_replies_count');
        $threads = $board->getAttribute('threads_count');

        if ($replies === null || $threads === null) {
            return (int) $board->threads()->sum('replies_count') + $board->threads()->count();
        }

        return (int) $replies + (int) $threads;
    }
}
