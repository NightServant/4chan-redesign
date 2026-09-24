<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Schema;

/**
 * The feed's popular and latest sorts order the visible slice of `threads` by
 * `replies_count` and `posted_at`. On Postgres, dropping either index turns
 * that into a sequential scan plus a full sort instead of an index scan with
 * a limit — verified directly with `EXPLAIN ANALYZE` against ~32k threads
 * across ~77 boards, where it was roughly 40x slower without them.
 *
 * This does not re-run that benchmark; it just fails loudly if either index
 * is later dropped without anyone measuring what that costs.
 */
it('keeps the feed sort indexes on threads', function (): void {
    $columns = collect(Schema::getIndexes('threads'))
        ->pluck('columns')
        ->map(fn (array $columns): array => $columns)
        ->all();

    expect($columns)->toContainEqual(['replies_count'])
        ->and($columns)->toContainEqual(['posted_at']);
});
