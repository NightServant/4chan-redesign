<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Post;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

/**
 * A reply, as one row of search results: the `CommentResult` type in
 * `types/clover.ts`.
 *
 * Distinct from `CommentTree`, which is the same rows nested inside the
 * thread that holds them. A search result has no tree to sit in — the
 * replies it lists come from different threads on different boards — so
 * what it carries instead is where the reply lives: the board, the thread,
 * and the post number the thread page anchors on (`#p{no}`).
 *
 * Only replies ever reach this. `SearchController` excludes `is_op`, because
 * an opening post is already a result on the Posts tab and listing it twice
 * under two names would be the same thread counted twice.
 *
 * Expects `thread.board` to be eager loaded: the board slug is needed for the
 * row's identity line and again for every attachment URL, so a page of these
 * built from bare models is two queries per row.
 */
final class CommentResultResource extends JsonResource
{
    /** Long enough to see why it matched, short enough to stay one row. */
    private const EXCERPT_LENGTH = 240;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var Post $post */
        $post = $this->resource;

        $thread = $post->thread;

        return [
            'id' => $post->id,
            'no' => $post->no,
            'board' => $thread->board->displaySlug(),
            'boardName' => $thread->board->title,
            'threadNo' => $thread->no,
            'threadTitle' => $thread->displayTitle(),
            'time' => RelativeTime::since($post->posted_at),
            'body' => Str::limit(trim($post->body), self::EXCERPT_LENGTH),

            /** Inherited from the board, exactly as a thread's is. */
            'nsfw' => ! $thread->board->worksafe,

            /**
             * Replies carry files as often as opening posts do, and the row
             * renders a thumbnail when there is one. Withheld or shown by the
             * same server-side rule every other attachment goes through.
             */
            'media' => AttachmentResource::for($post, $request),
        ];
    }
}
