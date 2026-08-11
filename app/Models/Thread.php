<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\ThreadFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * A thread on a board, e.g. `/g/109522303`.
 *
 * @property int $id
 * @property int $board_id
 * @property int $no
 * @property string|null $subject
 * @property bool $sticky
 * @property bool $closed
 * @property int $replies_count
 * @property int $images_count
 * @property Carbon $posted_at
 * @property Carbon $bumped_at
 * @property Carbon|null $posts_synced_at
 * @property Carbon|null $synced_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Board $board
 * @property-read Post|null $originalPost
 * @property-read Collection<int, Post> $posts
 */
#[Fillable([
    'board_id',
    'no',
    'subject',
    'sticky',
    'closed',
    'replies_count',
    'images_count',
    'posted_at',
    'bumped_at',
    'posts_synced_at',
    'synced_at',
])]
class Thread extends Model
{
    /** @use HasFactory<ThreadFactory> */
    use HasFactory;

    /**
     * How many characters of the opening post stand in for a missing subject.
     *
     * Most threads have no `sub`: only a handful of boards require one. The
     * card needs a heading regardless, so the opening line becomes it.
     */
    private const TITLE_FALLBACK_LENGTH = 80;

    /** @return BelongsTo<Board, $this> */
    public function board(): BelongsTo
    {
        return $this->belongsTo(Board::class);
    }

    /** @return HasMany<Post, $this> */
    public function posts(): HasMany
    {
        return $this->hasMany(Post::class);
    }

    /** @return HasOne<Post, $this> */
    public function originalPost(): HasOne
    {
        return $this->hasOne(Post::class)->where('is_op', true);
    }

    /** @return HasMany<Bookmark, $this> */
    public function bookmarks(): HasMany
    {
        return $this->hasMany(Bookmark::class);
    }

    /** @return HasMany<ThreadRead, $this> */
    public function reads(): HasMany
    {
        return $this->hasMany(ThreadRead::class);
    }

    /**
     * Threads on a board this anon is allowed to see.
     *
     * Every surface that lists threads has to apply this, not just the two
     * that take a board slug in the URL: a board hidden from its own page and
     * still named in the feed is not hidden.
     *
     * A subquery rather than `whereHas`, which would be the obvious spelling.
     * It reads as one set membership test instead of a correlated exists, and
     * it keeps the board scope's own type — a closure passed to `whereHas`
     * arrives as a builder over `Model`, so the visibility rule silently stops
     * being checked at all by static analysis.
     *
     * @param  Builder<Thread>  $query
     * @return Builder<Thread>
     */
    public function scopeOnVisibleBoard(Builder $query, bool $showsMatureBoards): Builder
    {
        return $query->whereIn(
            'board_id',
            Board::query()->visible($showsMatureBoards)->select('id'),
        );
    }

    /**
     * The heading a thread card renders.
     *
     * Falls back to the opening line of the OP, then to the post number. The
     * post number is never pretty, but it is true, and a thread with neither a
     * subject nor a body is a real thing upstream: an image with no comment.
     */
    public function displayTitle(): string
    {
        if (filled($this->subject)) {
            return $this->subject;
        }

        $opening = trim(Str::before((string) $this->originalPost?->body, "\n"));

        if ($opening !== '') {
            return Str::limit($opening, self::TITLE_FALLBACK_LENGTH);
        }

        return ">>{$this->no}";
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sticky' => 'boolean',
            'closed' => 'boolean',
            'posted_at' => 'datetime',
            'bumped_at' => 'datetime',
            'posts_synced_at' => 'datetime',
            'synced_at' => 'datetime',
        ];
    }
}
