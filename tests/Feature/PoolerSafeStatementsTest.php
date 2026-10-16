<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;

/**
 * Production reaches Neon through its PgBouncer pooler, which renames each
 * named prepared statement on the server. PDO frees a named statement with a
 * SQL `DEALLOCATE` under the client's name, the pooler cannot match it, and
 * the failure — ignored by PDO — aborts the transaction it ran in. Every
 * statement after it then fails with SQLSTATE 25P02: the sync's catalog import
 * died that way on every run from 2026-10-15.
 *
 * CI's Postgres has no pooler, so the abort itself cannot be reproduced here.
 * What can be checked is the cause: no named statement is ever created, so
 * there is nothing to `DEALLOCATE`.
 */
it('creates no named prepared statement for the pooler to lose', function (): void {
    DB::transaction(function (): void {
        $pending = DB::connection()->getPdo()->prepare('select ?::int as one');
        $pending->execute([1]);

        expect(DB::scalar('select count(*) from pg_prepared_statements'))->toBe(0);
    });
})->skip(fn (): bool => config('database.default') !== 'pgsql', 'Prepared statements are a Postgres concern here.');
