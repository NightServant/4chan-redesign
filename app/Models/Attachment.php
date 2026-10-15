<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\AttachmentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use InvalidArgumentException;
use RuntimeException;
use Symfony\Component\Mime\MimeTypes;

/**
 * The one file Clover holds: an image attached to a reply written here.
 *
 * Kept as a row because the deployment has no durable disk. `posts.media_path`
 * carries this row's `uuid`, which is what the image URL is built from.
 *
 * @property int $id
 * @property string $uuid
 * @property int $post_id
 * @property string $mime
 * @property int $size
 * @property int|null $width
 * @property int|null $height
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property-read Post $post
 */
#[Fillable(['uuid', 'post_id', 'mime', 'bytes', 'size', 'width', 'height'])]
#[Hidden(['bytes'])]
class Attachment extends Model
{
    /** @use HasFactory<AttachmentFactory> */
    use HasFactory;

    /** @return BelongsTo<Post, $this> */
    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class);
    }

    /**
     * The image itself.
     *
     * Fetched here, on demand, when the row was loaded without it: the bytes
     * are up to 4MB, and a request that is about to be refused should not
     * have read them. Postgres hands back a `bytea` column as a stream and
     * SQLite as a string, so this is the one place that settles which. Read
     * once: a stream is spent after the first read.
     */
    public function contents(): string
    {
        $bytes = array_key_exists('bytes', $this->attributes)
            ? $this->attributes['bytes']
            : static::query()->whereKey($this->getKey())->value('bytes');

        return (string) (is_resource($bytes) ? stream_get_contents($bytes) : $bytes);
    }

    /**
     * Bytes as a stream, which is how a column of them is written.
     *
     * Postgres rejects a PHP string that is not valid UTF-8, and a stream is
     * bound as a large object instead; SQLite takes either.
     *
     * @return resource
     */
    public static function stream(string $bytes)
    {
        $stream = fopen('php://memory', 'r+b') ?: throw new RuntimeException('php://memory is not available.');
        fwrite($stream, $bytes);
        rewind($stream);

        return $stream;
    }

    /**
     * The MIME types a reply may carry, taken from the configured extensions
     * so the list is written once.
     *
     * @return array<int, string>
     */
    public static function allowedMimes(): array
    {
        return collect((array) config('clover.attachments.mimes'))
            ->flatMap(fn (string $extension): array => MimeTypes::getDefault()->getMimeTypes($extension))
            ->unique()
            ->values()
            ->all();
    }

    /**
     * The extension an accepted type is stored under: the first configured
     * one that names it, so `image/jpeg` is `.jpg` whatever the upload was
     * called.
     */
    public static function extensionFor(string $mime): string
    {
        foreach ((array) config('clover.attachments.mimes') as $extension) {
            if (in_array($mime, MimeTypes::getDefault()->getMimeTypes($extension), true)) {
                return '.'.$extension;
            }
        }

        throw new InvalidArgumentException("{$mime} is not an accepted image type.");
    }

    /** The bytes stored so far, which is what the total cap counts. */
    public static function totalBytes(): int
    {
        return (int) static::query()->sum('size');
    }

    /** The bytes stored for one account's replies, which is its share. */
    public static function bytesOf(User $user): int
    {
        return (int) static::query()
            ->whereIn('post_id', Post::query()->where('user_id', $user->id)->select('id'))
            ->sum('size');
    }
}
