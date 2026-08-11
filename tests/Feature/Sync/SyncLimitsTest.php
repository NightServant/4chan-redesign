<?php

declare(strict_types=1);

use App\Models\Board;

/**
 * The two sync limits, which look alike and cost nothing alike.
 *
 * `--limit` caps threads taken from a catalog. It may be null, because one
 * `catalog.json` request already returns every thread on the board — capping
 * only discards rows that have been fetched and paid for.
 *
 * `--post-limit` caps threads whose full page is fetched, and that is one
 * request *each*. Against the eleven thousand threads a full sync stores, an
 * uncapped run is better than three hours at the rate limit.
 *
 * The second used to fall back to the first. When the thread limit gained its
 * null case, the post limit kept declaring `int` and returned it anyway, so
 * `clover:sync --with-posts` type-errored unless `--post-limit` was passed
 * explicitly. Nothing caught it: every existing test that used `--with-posts`
 * also passed `--post-limit`, which is exactly the combination that hides it.
 */
it('runs --with-posts without being given a post limit', function (): void {
    Board::factory()->slug('g')->create();

    $this->artisan('clover:sync', ['--board' => ['g'], '--with-posts' => true])
        ->assertExitCode(0);
});

it('caps the post limit rather than defaulting to every thread', function (): void {
    expect(config('clover.sync.threads_with_posts'))
        ->toBeInt()
        ->toBeGreaterThan(0);
});

/**
 * The thread limit keeps its null case: a catalog is one request whatever it
 * returns, so there is nothing to save by truncating it.
 */
it('leaves the thread limit uncapped', function (): void {
    expect(config('clover.sync.threads_per_board'))->toBeNull();
});
