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
     * Whether this thread's attachment is withheld.
     *
     * The homepage sets it. That page is the first thing a visitor sees and it
     * is marketing copy, not a board — putting whatever anons uploaded in the
     * last hour behind the product's own pitch is a poor introduction and an
     * unpredictable one.
     *
     * Withheld here rather than hidden in the browser, because those are not
     * the same thing. If the URL reaches the page, the file can be requested;
     * suppressing it server-side means the homepage cannot make a request to
     * 4chan's CDN at all, whatever the markup does.
     */
    private bool $withholdsMedia = false;

    /** Send this thread without its attachment. */
    public function withoutMedia(): static
    {
        $this->withholdsMedia = true;

        return $this;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $thread = $this->thread();
        $originalPost = $thread->originalPost;

        return [
            'id' => $thread->id,
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

            /** Inherited from the board. A thread is not marked in itself. */
            'nsfw' => ! $thread->board->worksafe,

            'replies' => $thread->replies_count,
            'images' => number_format($thread->images_count),

            /**
             * The OP's attachment, or null when the thread opened without one.
             * Only ever what 4chan reported: this application stores the id of
             * a file, never the file.
             */
            'media' => $this->withholdsMedia
                ? null
                : AttachmentResource::for($originalPost, $request),

            'pinned' => $thread->sticky,

            /**
             * Per-viewer state, so the control renders pressed without a
             * second round trip after the page loads. It resolves to false for
             * a signed-out anon, which is correct rather than a fallback: they
             * have saved nothing.
             */
            'bookmarked' => $this->isBookmarked($request),
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

    /**
     * Whether this anon saved this thread.
     *
     * Reads a preloaded relation when the caller supplied one — a feed of
     * thirty cards asking the database individually is thirty queries for one
     * boolean each. Falls back to a query so a resource built from a bare
     * model is slow rather than wrong.
     */
    private function isBookmarked(Request $request): bool
    {
        $user = $request->user();

        if ($user === null) {
            return false;
        }

        $thread = $this->thread();

        if ($thread->relationLoaded('bookmarks')) {
            return $thread->bookmarks->contains('user_id', $user->id);
        }

        return $thread->bookmarks()->where('user_id', $user->id)->exists();
    }

    private function thread(): Thread
    {
        /** @var Thread $thread */
        $thread = $this->resource;

        return $thread;
    }
}
