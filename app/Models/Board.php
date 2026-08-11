<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\BoardFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * A board, e.g. `/g/`.
 *
 * @property int $id
 * @property string $slug
 * @property string $title
 * @property string $description
 * @property string $category
 * @property bool $worksafe
 * @property int $max_comment_chars
 * @property int $bump_limit
 * @property int $image_limit
 * @property int $per_page
 * @property int $pages
 * @property bool $is_archived
 * @property Carbon|null $synced_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Collection<int, Thread> $threads
 */
#[Fillable([
    'slug',
    'title',
    'description',
    'category',
    'worksafe',
    'max_comment_chars',
    'bump_limit',
    'image_limit',
    'per_page',
    'pages',
    'is_archived',
    'synced_at',
])]
class Board extends Model
{
    /** @use HasFactory<BoardFactory> */
    use HasFactory;

    /**
     * The slug as the interface renders it, carrying its delimiters: `/g/`.
     *
     * Stored bare because three of 4chan's slugs are numeric, and kept out of
     * the database rather than duplicated into a column so there is one
     * definition of the display form.
     */
    public function displaySlug(): string
    {
        return "/{$this->slug}/";
    }

    /** @return HasMany<Thread, $this> */
    public function threads(): HasMany
    {
        return $this->hasMany(Thread::class);
    }

    /**
     * Boards this anon is allowed to see.
     *
     * Adult boards are hidden unless an anon has opted in, and a request with
     * no account is always the filtered view — the preference is account-level
     * and there is no account to read it from. Passing `false` is therefore the
     * correct behaviour for a signed-out visitor, not a fallback.
     *
     * @param  Builder<Board>  $query
     * @return Builder<Board>
     */
    public function scopeVisible(Builder $query, bool $showsMatureBoards): Builder
    {
        return $showsMatureBoards ? $query : $query->where('worksafe', true);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'worksafe' => 'boolean',
            'is_archived' => 'boolean',
            'synced_at' => 'datetime',
        ];
    }
}
