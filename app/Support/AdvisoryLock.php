<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Support\Facades\DB;

/**
 * Postgres advisory locks, for the two places a row lock cannot do the job.
 *
 * `SELECT ... FOR UPDATE` locks rows that exist. Allocating the next post
 * number and checking the space left both depend on rows that do not exist
 * yet, or on a sum over all of them, so there is nothing to lock. An advisory
 * lock is a named mutex instead.
 *
 * Transaction-scoped: released at commit or rollback, so it cannot leak, and
 * it must be taken inside the transaction it protects. SQLite serialises every
 * write already, so there it does nothing.
 *
 * Two integers, a namespace and a key, so the locks below never collide with
 * one another: the images lock has key 0, a board's numbering lock has the
 * board's id.
 */
final class AdvisoryLock
{
    /** Stored images: the total and the per-account share. */
    public const IMAGES = 7101;

    /** Local post numbers, one lock per board. */
    public const POST_NUMBERS = 7102;

    public static function take(int $namespace, int $key = 0): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::select('select pg_advisory_xact_lock(?::int, ?::int)', [$namespace, $key]);
        }
    }
}
