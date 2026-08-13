<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\PostFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * The OP or a reply on a thread.
 *
 * @property int $id
 * @property int $thread_id
 * @property int|null $user_id
 * @property bool $is_local
 * @property int $no
 * @property bool $is_op
 * @property string $author
 * @property string|null $tripcode
 * @property string|null $capcode
 * @property string $body
 * @property array<int, int> $quotes
 * @property string|null $media_filename
 * @property string|null $media_extension
 * @property int|null $media_tim
 * @property int|null $media_width
 * @property int|null $media_height
 * @property int|null $media_thumb_width
 * @property int|null $media_thumb_height
 * @property int|null $media_size
 * @property bool $media_spoiler
 * @property CarbonImmutable $posted_at
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property-read Thread $thread
 */
#[Fillable([
    'thread_id',
    'user_id',
    'no',
    'is_op',
    'is_local',
    'author',
    'tripcode',
    'capcode',
    'body',
    'quotes',
    'media_filename',
    'media_extension',
    'media_tim',
    'media_width',
    'media_height',
    'media_thumb_width',
    'media_thumb_height',
    'media_size',
    'media_spoiler',
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

    /**
     * Who wrote this here. Null for everything ingested, which is almost
     * everything, and never rendered to anyone but the anon themselves.
     *
     * @return BelongsTo<User, $this>
     */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function hasMedia(): bool
    {
        return filled($this->media_filename) && $this->media_tim !== null;
    }

    /**
     * The full-size attachment, on 4chan's CDN.
     *
     * Addressed by `tim`, 4chan's own id for the file, never by the filename
     * an anon uploaded. Needs the board slug, which lives a relation away —
     * eager load `thread.board` before calling this for a list of posts.
     */
    public function mediaUrl(): ?string
    {
        if (! $this->hasMedia()) {
            return null;
        }

        return sprintf(
            '%s/%s/%d%s',
            rtrim((string) config('clover.cdn.images'), '/'),
            $this->thread->board->slug,
            $this->media_tim,
            $this->media_extension,
        );
    }

    /**
     * The thumbnail. Always JPEG regardless of what the original was, which
     * is upstream's rule and not an assumption: a `.webm` attachment still
     * has a `.jpg` thumbnail.
     */
    public function mediaThumbnailUrl(): ?string
    {
        if (! $this->hasMedia()) {
            return null;
        }

        return sprintf(
            '%s/%s/%ds.jpg',
            rtrim((string) config('clover.cdn.images'), '/'),
            $this->thread->board->slug,
            $this->media_tim,
        );
    }

    /**
     * Why this attachment is covered, or null when it is shown outright.
     *
     * Decided here rather than in the browser. A client that received the URL
     * and a "please blur this" hint could always be asked not to blur it; the
     * reason travels with the image so the interface has one honest state to
     * render, and the two causes stay distinguishable because they warrant
     * different copy.
     *
     * `spoiler` is 4chan's own flag, set by whoever posted it. `mature` is
     * ours, and covers everything on a board 4chan marks not worksafe — an
     * anon who opted into seeing those boards has agreed to find them, not to
     * have every image on them arrive unannounced.
     */
    public function mediaConcealment(): ?string
    {
        if (! $this->hasMedia()) {
            return null;
        }

        if ($this->media_spoiler) {
            return 'spoiler';
        }

        return $this->thread->board->worksafe ? null : 'mature';
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
            'is_local' => 'boolean',
            'media_spoiler' => 'boolean',
            'quotes' => 'array',
            'posted_at' => 'datetime',
        ];
    }
}
