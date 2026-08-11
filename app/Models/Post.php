<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\PostFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * The OP or a reply on a thread.
 *
 * @property int $id
 * @property int $thread_id
 * @property int $no
 * @property bool $is_op
 * @property string $author
 * @property string|null $tripcode
 * @property string|null $capcode
 * @property string $body
 * @property array<int, int> $quotes
 * @property string|null $media_filename
 * @property string|null $media_extension
 * @property int|null $media_width
 * @property int|null $media_height
 * @property int|null $media_size
 * @property Carbon $posted_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Thread $thread
 */
#[Fillable([
    'thread_id',
    'no',
    'is_op',
    'author',
    'tripcode',
    'capcode',
    'body',
    'quotes',
    'media_filename',
    'media_extension',
    'media_width',
    'media_height',
    'media_size',
    'posted_at',
])]
class Post extends Model
{
    /** @use HasFactory<PostFactory> */
    use HasFactory;

    /** @return BelongsTo<Thread, $this> */
    public function thread(): BelongsTo
    {
        return $this->belongsTo(Thread::class);
    }

    public function hasMedia(): bool
    {
        return filled($this->media_filename);
    }

    /**
     * The one line the media placeholder renders: name, dimensions, size.
     *
     * Built from what 4chan actually reported. Nothing here is estimated, and
     * when a post has no attachment this is null rather than a placeholder
     * standing in for a file that does not exist.
     */
    public function mediaLabel(): ?string
    {
        if (! $this->hasMedia()) {
            return null;
        }

        $name = $this->media_filename.$this->media_extension;

        $parts = [$name];

        if ($this->media_width !== null && $this->media_height !== null) {
            $parts[] = "{$this->media_width}x{$this->media_height}";
        }

        if ($this->media_size !== null) {
            $parts[] = self::formatBytes($this->media_size);
        }

        return implode(' · ', $parts);
    }

    /**
     * Bytes as the board itself reports them: KB and MB, one decimal, binary
     * units. Matching upstream matters more than SI correctness here, because
     * an anon comparing a filesize against 4chan's own limit should not have
     * to convert between two conventions to do it.
     */
    private static function formatBytes(int $bytes): string
    {
        if ($bytes >= 1024 * 1024) {
            return round($bytes / (1024 * 1024), 1).' MB';
        }

        return round($bytes / 1024).' KB';
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_op' => 'boolean',
            'quotes' => 'array',
            'posted_at' => 'datetime',
        ];
    }
}
