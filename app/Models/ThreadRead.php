<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\ThreadReadFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * The last time an anon read a thread, and how far they got.
 *
 * One row per anon per thread, replaced rather than appended to: a history
 * that recorded every visit would list the same thread six times in an
 * afternoon, which is a log rather than a history.
 *
 * @property int $id
 * @property int $user_id
 * @property int $thread_id
 * @property int $progress
 * @property Carbon $last_read_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read User $user
 * @property-read Thread $thread
 */
#[Fillable(['user_id', 'thread_id', 'progress', 'last_read_at'])]
class ThreadRead extends Model
{
    /** @use HasFactory<ThreadReadFactory> */
    use HasFactory;

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Thread, $this> */
    public function thread(): BelongsTo
    {
        return $this->belongsTo(Thread::class);
    }

    /**
     * Progress as a percentage the column can hold.
     *
     * The client reports this, so it is not trusted: the history screen sorts
     * by least finished, and one value of 400 would sit above everything real.
     */
    public static function clampProgress(int $progress): int
    {
        return max(0, min(100, $progress));
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'progress' => 'integer',
            'last_read_at' => 'datetime',
        ];
    }
}
