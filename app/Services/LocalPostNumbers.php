<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Board;
use App\Models\Post;
use Illuminate\Support\Facades\DB;

/**
 * Post numbers for posts written here.
 *
 * Every post needs one. `>>109522303` references are how an imageboard quotes,
 * the reply tree is nested by them, and `posts` is unique on `[thread_id, no]`
 * — so a local reply cannot simply go without.
 *
 * It cannot take the next number after the thread's highest either. 4chan's
 * sequence keeps moving, so a local reply numbered one above today's newest
 * post is a number upstream will itself issue within the hour, and the next
 * sync would collide with it and be rejected. The local post would silently
 * displace a real one.
 *
 * So local numbers are allocated from a range far above anything upstream has
 * reached. 4chan's per-board sequences are in the hundred-millions after two
 * decades; the base here is two orders of magnitude beyond that, and it is
 * per-board because 4chan's numbering is too.
 */
final class LocalPostNumbers
{
    /**
     * Where local numbering starts.
     *
     * Deliberately far from upstream rather than merely above it. /g/ is
     * around 109,000,000 and gains roughly a million a month; at that rate
     * this base is centuries away, and it is obviously synthetic to anyone
     * reading a post number rather than looking like a real one.
     */
    public const BASE = 9_000_000_000;

    /**
     * The next number for a post on this board.
     *
     * Locked for the duration of the transaction the caller is in, because two
     * anons replying at once would otherwise read the same maximum and write
     * the same number — and the unique index would reject the second, losing a
     * post that was correctly submitted.
     */
    public static function next(Board $board): int
    {
        return DB::transaction(function () use ($board): int {
            /** @var int|null $highest */
            $highest = Post::query()
                ->whereIn('thread_id', $board->threads()->select('id'))
                ->where('no', '>=', self::BASE)
                ->lockForUpdate()
                ->max('no');

            return $highest === null ? self::BASE : $highest + 1;
        });
    }

    /** Whether a post number was issued here rather than by 4chan. */
    public static function isLocal(int $no): bool
    {
        return $no >= self::BASE;
    }
}
