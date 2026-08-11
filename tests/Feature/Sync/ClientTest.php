<?php

declare(strict_types=1);

use App\Services\FourChan\Client;
use App\Services\FourChan\UpstreamException;
use Carbon\CarbonInterval;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Sleep;
use Tests\Feature\Sync\Fixture;

/**
 * The two conditions 4chan asks every client to honour — a request a second,
 * and `If-Modified-Since` on all of them — are enforced inside the client, so
 * these tests go through the client rather than checking a caller remembered.
 */
beforeEach(function (): void {
    Sleep::fake();
});

afterEach(function (): void {
    Sleep::fake(false);
});

it('waits out the rate limit between requests', function (): void {
    Http::fake(['a.4cdn.org/*' => Http::response(Fixture::raw('boards.json'))]);

    $client = app(Client::class);

    $client->boards();
    $client->catalog('g');

    /** The first request has nothing to wait for; the second one does. */
    Sleep::assertSleptTimes(1);
    Sleep::assertSlept(fn (CarbonInterval $duration): bool => $duration->totalSeconds > 0
        && $duration->totalSeconds <= 1);
});

it('paces separate client instances against the same limit', function (): void {
    Http::fake(['a.4cdn.org/*' => Http::response(Fixture::raw('boards.json'))]);

    app(Client::class)->boards();
    app(Client::class)->boards();

    Sleep::assertSleptTimes(1);
});

it('sends If-Modified-Since built from the previous response and treats 304 as unchanged', function (): void {
    $lastModified = 'Thu, 19 Mar 2026 16:38:15 GMT';

    Http::fake(fn (Request $request) => $request->hasHeader('If-Modified-Since')
        ? Http::response('', 304)
        : Http::response(Fixture::raw('boards.json'), 200, ['Last-Modified' => $lastModified]));

    $client = app(Client::class);

    $first = $client->boards();

    expect($first->isFetched())->toBeTrue()
        ->and($first->lastModified)->toBe($lastModified)
        ->and($first->data['boards'])->toBeArray();

    $second = $client->boards();

    expect($second->isUnchanged())->toBeTrue()
        ->and($second->isFetched())->toBeFalse()
        /** Unchanged is not empty data: a caller must not read this as "no boards". */
        ->and($second->data)->toBe([]);

    Http::assertSent(fn (Request $request): bool => $request->hasHeader('If-Modified-Since', $lastModified));
});

it('remembers Last-Modified per endpoint', function (): void {
    Http::fake(['a.4cdn.org/*' => Http::response(Fixture::raw('boards.json'), 200, [
        'Last-Modified' => 'Thu, 19 Mar 2026 16:38:15 GMT',
    ])]);

    $client = app(Client::class);

    $client->boards();
    $client->catalog('g');

    /** The catalog has never been read, so it must not claim a modified date. */
    Http::assertSent(fn (Request $request): bool => str_contains($request->url(), '/g/catalog.json')
        && ! $request->hasHeader('If-Modified-Since'));
});

it('reports a deleted board as missing rather than throwing', function (): void {
    Http::fake(['a.4cdn.org/*' => Http::response('', 404)]);

    $result = app(Client::class)->catalog('qa');

    expect($result->isMissing())->toBeTrue()
        ->and($result->isFetched())->toBeFalse();
});

it('throws when upstream cannot be reached', function (): void {
    Http::fake(fn () => throw new ConnectionException('cURL error 28: timed out'));

    app(Client::class)->boards();
})->throws(UpstreamException::class, 'Could not reach 4chan');

it('throws when the response is not JSON', function (): void {
    Http::fake(['a.4cdn.org/*' => Http::response('<html>attention required</html>')]);

    app(Client::class)->boards();
})->throws(UpstreamException::class, 'was not JSON');

it('throws on an unexpected status', function (): void {
    Http::fake(['a.4cdn.org/*' => Http::response('', 503)]);

    app(Client::class)->catalog('g');
})->throws(UpstreamException::class, 'HTTP 503');

it('builds urls for numeric slugs', function (string $slug): void {
    Http::fake(['a.4cdn.org/*' => Http::response(Fixture::raw('3-catalog.json'))]);

    app(Client::class)->catalog($slug);

    Http::assertSent(fn (Request $request): bool => $request->url() === "https://a.4cdn.org/{$slug}/catalog.json");
})->with(['3', 'r9k', 's4s']);

it('builds a thread url', function (): void {
    Http::fake(['a.4cdn.org/*' => Http::response(Fixture::raw('g-thread-109514275.json'))]);

    app(Client::class)->thread('g', 109514275);

    Http::assertSent(fn (Request $request): bool => $request->url() === 'https://a.4cdn.org/g/thread/109514275.json');
});
