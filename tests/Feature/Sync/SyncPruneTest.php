<?php

declare(strict_types=1);

use App\Models\Board;
use App\Models\Thread;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Sleep;
use Tests\Feature\Sync\Fixture;

/**
 * When `clover:sync` deletes a thread, and when it must not.
 *
 * Only a `200` catalog taken whole proves a thread is gone. Everything else —
 * a `304`, a `404`, a failure, a capped catalog — is a response that cannot
 * tell "gone" from "did not answer", and deleting on any of them is how a
 * flaky upstream empties the site.
 */
beforeEach(function (): void {
    Sleep::fake();
});

/** A stale thread on /g/ that the recorded catalog does not list. */
function staleThread(): Thread
{
    return Thread::factory()->for(Board::factory()->slug('g')->create())->create(['no' => 100]);
}

function fakeCatalog(mixed $response): void
{
    Http::fake([
        'a.4cdn.org/boards.json' => Http::response(Fixture::raw('boards.json')),
        'a.4cdn.org/g/catalog.json' => $response,
    ]);
}

it('prunes the threads a full 200 catalog no longer lists', function (): void {
    $stale = staleThread();
    fakeCatalog(Http::response(Fixture::raw('g-catalog.json')));

    $this->artisan('clover:sync', ['--board' => ['g']])->assertExitCode(0);

    expect(Thread::query()->whereKey($stale->id)->exists())->toBeFalse()
        ->and(Thread::query()->where('board_id', $stale->board_id)->count())->toBe(6);
});

it('prunes nothing on a 304', function (): void {
    $stale = staleThread();
    fakeCatalog(Http::response('', 304));

    $this->artisan('clover:sync', ['--board' => ['g']])->assertExitCode(0);

    expect(Thread::query()->whereKey($stale->id)->exists())->toBeTrue();
});

it('prunes nothing on a 404', function (): void {
    $stale = staleThread();
    fakeCatalog(Http::response('', 404));

    $this->artisan('clover:sync', ['--board' => ['g']])->assertExitCode(0);

    expect(Thread::query()->whereKey($stale->id)->exists())->toBeTrue();
});

it('prunes nothing when upstream answers with an error', function (): void {
    $stale = staleThread();
    fakeCatalog(Http::response('', 503));

    $this->artisan('clover:sync', ['--board' => ['g']])->assertExitCode(1);

    expect(Thread::query()->whereKey($stale->id)->exists())->toBeTrue();
});

it('prunes nothing when upstream cannot be reached', function (): void {
    $stale = staleThread();
    fakeCatalog(fn () => throw new ConnectionException('cURL error 28: timed out'));

    $this->artisan('clover:sync', ['--board' => ['g']])->assertExitCode(1);

    expect(Thread::query()->whereKey($stale->id)->exists())->toBeTrue();
});

it('prunes nothing when a thread limit cut the catalog short', function (): void {
    $stale = staleThread();
    fakeCatalog(Http::response(Fixture::raw('g-catalog.json')));

    $this->artisan('clover:sync', ['--board' => ['g'], '--limit' => 2])->assertExitCode(0);

    expect(Thread::query()->whereKey($stale->id)->exists())->toBeTrue();
});
