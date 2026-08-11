<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Post;
use App\Models\Thread;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

/**
 * A thread as a card renders it: the `Thread` type in `types/clover.ts`.
 *
 * Expects `board` and `originalPost` to be eager loaded. A feed page draws
 * thirty of these and every one of them needs both, so a lazy load here is
 * sixty queries — the whole reason `FeedController` loads them up front.
 */
final class ThreadResource extends JsonResource
{
    /** Beyond this the card truncates anyway, so the rest is bytes on the wire. */
    private const EXCERPT_LENGTH = 240;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $thread = $this->thread();
        $originalPost = $thread->originalPost;

        return [
            'no' => $thread->no,
            'board' => $thread->board->displaySlug(),
            'boardName' => $thread->board->title,

            /**
             * When the thread was opened, not when it was last bumped. The
             * same value reads correctly in both places it appears: beside
             * the OP on the thread page, and on the card in a feed.
             */
            'time' => RelativeTime::since($thread->posted_at),

            'title' => $thread->displayTitle(),
            'excerpt' => $this->when(
                $this->excerpt($thread, $originalPost) !== null,
                fn (): ?string => $this->excerpt($thread, $originalPost),
            ),

            /**
             * Blessings are Clover's own votes, and voting is task 11b. There
             * is no table to count, so every ingested thread has none — a true
             * zero, not a missing value.
             */
            'blessings' => 0,

            'replies' => $thread->replies_count,
            'images' => number_format($thread->images_count),

            /**
             * The OP's attachment, or null when the thread opened without one.
             * Only ever what 4chan reported: this application stores the id of
             * a file, never the file.
             */
            'media' => AttachmentResource::for($originalPost, $request),

            'pinned' => $thread->sticky,
        ];
    }

    /**
     * The preview line under the title, or null when there is nothing left to
     * preview.
     *
     * A thread with no subject already has its opening line promoted into the
     * title by `displayTitle()`, so repeating the body underneath would print
     * the same sentence twice. In that case the excerpt is what follows the
     * first line, which is usually where the links and the greentext are.
     */
    private function excerpt(Thread $thread, ?Post $originalPost): ?string
    {
        $body = trim((string) $originalPost?->body);

        if ($body === '') {
            return null;
        }

        $remainder = filled($thread->subject)
            ? $body
            : trim(Str::after($body, "\n"));

        return $remainder === '' ? null : Str::limit($remainder, self::EXCERPT_LENGTH);
    }

    private function thread(): Thread
    {
        /** @var Thread $thread */
        $thread = $this->resource;

        return $thread;
    }
}
