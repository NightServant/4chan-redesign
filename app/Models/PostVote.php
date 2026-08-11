<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\PostVoteFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * One anon's blessing or curse on one post.
 *
 * @property int $id
 * @property int $user_id
 * @property int $post_id
 * @property int $value
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read User $user
 * @property-read Post $post
 */
#[Fillable(['user_id', 'post_id', 'value'])]
class PostVote extends Model
{
    /** @use HasFactory<PostVoteFactory> */
    use HasFactory;

    public const BLESSING = 1;

    public const CURSE = -1;

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Post, $this> */
    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class);
    }

    /**
     * Whether a value is one this table accepts.
     *
     * There is no zero. Withdrawing a vote deletes the row, so "has not voted"
     * has one representation rather than two that behave identically.
     */
    public static function isValid(int $value): bool
    {
        return $value === self::BLESSING || $value === self::CURSE;
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'value' => 'integer',
        ];
    }
}
