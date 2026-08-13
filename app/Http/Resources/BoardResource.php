<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Board;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A board, in the shape `Board` declares in `resources/js/types/clover.ts`.
 *
 * `threads` was an "anons online" figure while the screens ran on fixtures.
 * 4chan publishes no online count at any scope, so the field counts live
 * threads instead — counted, never estimated, and pre-formatted here because
 * the separator is a display concern the backend should not make the client
 * guess a locale for.
 */
class BoardResource extends JsonResource
{
    /**
     * Whether the board page's `description` is included.
     *
     * The board page needs `Board & { description: string }`; the sidebar rail
     * and the homepage grid do not, and sending a paragraph of copy to a five
     * row list is waste. Off by default, opted into per resource.
     */
    private bool $describes = false;

    /** Include the board's description, for surfaces that render it. */
    public function withDescription(): static
    {
        $this->describes = true;

        return $this;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $board = $this->board();

        return [
            'id' => $board->id,
            'slug' => $board->displaySlug(),
            'name' => $board->title,
            'threads' => number_format(self::threadCount($board)),

            /**
             * 4chan's own `ws_board`, inverted. Sent so the interface can mark
             * a board rather than merely hide one: an anon who has opted into
             * these boards still deserves to be told which is which before
             * they open it somewhere public.
             */
            'nsfw' => ! $board->worksafe,

            /**
             * Whether this anon follows the board. Was a hardcoded false while
             * the Join buttons were local component state that forgot itself
             * on reload; there is a table behind it now.
             */
            'subscribed' => $this->isSubscribed($request),
            'description' => $this->when($this->describes, fn (): string => $board->description),
        ];
    }

    /**
     * The board's live thread count.
     *
     * Prefers the `withCount('threads')` aggregate so a list of boards costs
     * one query rather than one per row. Falling back to a count keeps a
     * resource built from a bare model correct rather than reporting zero.
     */
    protected static function threadCount(Board $board): int
    {
        $counted = $board->getAttribute('threads_count');

        if ($counted === null) {
            return $board->threads()->count();
        }

        return (int) $counted;
    }

    /**
     * Whether this anon follows the board.
     *
     * Reads a preloaded relation when the caller supplied one, so a directory
     * of seventy-seven boards costs one query rather than seventy-seven.
     * Protected rather than private because `BoardDirectoryResource` extends
     * this one and calls it through the parent's `toArray`.
     */
    protected function isSubscribed(Request $request): bool
    {
        $user = $request->user();

        if ($user === null) {
            return false;
        }

        $board = $this->board();

        if ($board->relationLoaded('subscribers')) {
            return $board->subscribers->contains('id', $user->id);
        }

        return $board->subscribers()->where('users.id', $user->id)->exists();
    }

    protected function board(): Board
    {
        /** @var Board $board */
        $board = $this->resource;

        return $board;
    }
}
