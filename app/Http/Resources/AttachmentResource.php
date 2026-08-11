<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Post;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A post's attachment, in the shape `Attachment` declares.
 *
 * Expects `thread.board` to be loaded: both URLs are keyed on the board slug,
 * so building one for a list of posts without eager loading is a query per
 * image.
 *
 * `concealed` is decided here rather than sent as a hint the client may act on.
 * The interface never receives a "please blur this" flag alongside a URL it
 * could render anyway — it receives the reason, and the reason is what it
 * renders until an anon asks for the image.
 */
final class AttachmentResource extends JsonResource
{
    /**
     * @return array<string, mixed>|null
     */
    public function toArray(Request $request): ?array
    {
        /** @var Post $post */
        $post = $this->resource;

        if (! $post->hasMedia()) {
            return null;
        }

        return [
            'label' => $post->mediaLabel(),
            'filename' => $post->media_filename.$post->media_extension,
            'thumbnailUrl' => $post->mediaThumbnailUrl(),
            'fullUrl' => $post->mediaUrl(),
            'width' => $post->media_width,
            'height' => $post->media_height,
            'thumbWidth' => $post->media_thumb_width,
            'thumbHeight' => $post->media_thumb_height,
            'concealed' => $post->mediaConcealment(),
        ];
    }

    /**
     * The attachment for a post, or null when it has none.
     *
     * A named constructor because the null case is the common one — most
     * replies carry no file — and `new AttachmentResource(null)` would
     * otherwise serialise as an empty object rather than as nothing.
     *
     * @return array<string, mixed>|null
     */
    public static function for(?Post $post, Request $request): ?array
    {
        if ($post === null || ! $post->hasMedia()) {
            return null;
        }

        return (new self($post))->toArray($request);
    }
}
