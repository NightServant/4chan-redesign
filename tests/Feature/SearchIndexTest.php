<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;

/**
 * Search runs `ILIKE '%term%'` over post bodies. Without a trigram index that
 * reads every post. This fails if the index goes missing, or if the
 * controller's own query changes shape so that Postgres can no longer use it.
 *
 * The plan that is checked is the one for the query the controller really
 * sends: its SQL and bindings are captured off a real request and explained,
 * not rewritten by hand. A hand-written `explain` can pass while the
 * controller's query -- different escape clause, different column -- cannot
 * use the index at all.
 *
 * Sequential scans, plain index scans and nested loops are switched off for
 * the explain. The test tables are nearly empty, and what the planner prefers
 * for them depends on whatever earlier tests left in its statistics, so
 * "does it choose the index" would pass or fail with test order. What this
 * pins is whether the index can serve the query's predicate at all: with
 * every other way into `posts` ruled out, a plan that still names the index is
 * one that can use it. Whether it *should* is a question about row counts, and
 * is answered with `explain analyze` on real volumes.
 */
it('searches reply bodies through the trigram index', function (): void {
    if (DB::connection()->getDriverName() !== 'pgsql') {
        $this->markTestSkipped('Trigram indexes exist only on Postgres; SQLite LIKE is already case-insensitive and its data is small.');
    }

    $queries = [];

    DB::listen(function ($query) use (&$queries): void {
        if (str_contains($query->sql, ' ilike ')) {
            $queries[] = $query;
        }
    });

    $this->get('/search?q=linux&type=comments')->assertOk();

    expect($queries)->toHaveCount(1);

    foreach (['enable_seqscan', 'enable_indexscan', 'enable_nestloop'] as $setting) {
        DB::statement("set local {$setting} = off");
    }

    $plan = collect(DB::select('explain '.$queries[0]->sql, $queries[0]->bindings))
        ->pluck('QUERY PLAN')
        ->implode("\n");

    expect($plan)->toContain('posts_body_trgm');
});
