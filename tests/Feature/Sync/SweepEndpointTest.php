<?php

declare(strict_types=1);

use App\Models\Board;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Psr7\Request as PsrRequest;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Sleep;
use Tests\Feature\Sync\Fixture;

beforeEach(function (): void {
    /* The sweep paces itself at a request a second; the test must not. */
    Sleep::fake();

    config([
        'clover.sweep.token' => sweepToken(),
        'clover.sweep.origin' => 'https://clover.example',
    ]);
});

/**
 * Both routes are called by machines with the same secret, so what holds for
 * one holds for the other.
 */
dataset('sweep routes', ['trigger' => '/internal/sweep', 'run' => '/internal/sweep/run']);

function sweepToken(): string
{
    return 'test-sweep-token-0123456789abcdef';
}

function sweepAuth(): array
{
    return ['Authorization' => 'Bearer '.sweepToken()];
}

function fakeFourChan(): void
{
    Http::fake([
        'a.4cdn.org/boards.json' => Http::response(Fixture::raw('boards.json')),
        'a.4cdn.org/*/catalog.json' => Http::response(Fixture::raw('g-catalog.json')),
    ]);
}

/**
 * What Laravel throws when curl gives up: the Guzzle exception, with curl's
 * own account of what happened, as the previous exception.
 */
function curlFailure(int $errno, int $requestSize): ConnectionException
{
    $guzzle = new ConnectException(
        'cURL error '.$errno,
        new PsrRequest('POST', 'https://clover.example/internal/sweep/run'),
        null,
        ['errno' => $errno, 'request_size' => $requestSize],
    );

    return new ConnectionException($guzzle->getMessage(), 0, $guzzle);
}

it('refuses a call without the token', function (string $uri): void {
    Http::fake();

    $this->postJson($uri)->assertUnauthorized();
    $this->postJson($uri, [], ['Authorization' => 'Bearer wrong'])->assertUnauthorized();

    Http::assertNothingSent();
})->with('sweep routes');

it('refuses every call when no usable token is configured', function (?string $configured, string $uri): void {
    Http::fake();
    Log::spy();
    config(['clover.sweep.token' => $configured]);

    $this->postJson($uri, [], ['Authorization' => 'Bearer '.$configured])->assertUnauthorized();
    $this->postJson($uri)->assertUnauthorized();

    Http::assertNothingSent();
    Log::shouldHaveReceived('error')->atLeast()->once();
})->with([
    'unset' => [null],
    'empty' => [''],
    'too short' => ['short-but-secret'],
    'only whitespace' => [str_repeat(' ', 40)],
])->with('sweep routes');

it('tolerates whitespace pasted around the configured token', function (): void {
    Http::fake(['*/internal/sweep/run' => Http::response('', 200)]);
    config(['clover.sweep.token' => sweepToken()."\n"]);

    $this->postJson('/internal/sweep', [], sweepAuth())->assertStatus(202);
});

it('answers 409 while a sweep holds the lock', function (string $uri): void {
    Http::fake();
    Cache::lock('clover.sweep', 600)->get();

    $this->postJson($uri, [], sweepAuth())
        ->assertStatus(409)
        ->assertExactJson(['running' => true]);

    Http::assertNothingSent();
})->with('sweep routes');

it('is exempt from CSRF, which the rest of the site is not', function (string $uri): void {
    /*
     * Laravel switches CSRF checking off while tests run, so a 401 here would
     * prove nothing about the exemption. Presenting as a live app turns it
     * back on, and `/logout` is the control: it must still be refused with
     * 419, or this test is not looking at the real middleware.
     */
    $this->app['env'] = 'local';

    $this->post('/logout')->assertStatus(419);
    $this->post($uri, [], ['Authorization' => 'Bearer wrong'])->assertUnauthorized();
})->with('sweep routes');

it('starts the sweep by calling its own run route at the pinned origin', function (): void {
    Http::fake(['*/internal/sweep/run' => Http::response('', 200)]);
    config(['clover.sweep.origin' => 'https://clover.example/']);

    $this->postJson('/internal/sweep', [], sweepAuth())
        ->assertStatus(202)
        ->assertExactJson(['started' => true]);

    Http::assertSentCount(1);
    Http::assertSent(fn (Request $request): bool => $request->method() === 'POST'
        && $request->url() === 'https://clover.example/internal/sweep/run'
        && $request->hasHeader('Authorization', 'Bearer '.sweepToken()));
});

/**
 * The self-call carries the bearer token, so where it goes must not be
 * something the caller can choose. Every header a proxy honours is set here.
 */
it('sends the token to the pinned origin whatever the request says its host is', function (): void {
    Http::fake(['*/internal/sweep/run' => Http::response('', 200)]);

    $this->postJson('http://evil.example:8080/internal/sweep', [], sweepAuth() + [
        'Host' => 'evil.example',
        'X-Forwarded-Host' => 'evil.example',
        'X-Forwarded-Proto' => 'http',
        'X-Forwarded-Port' => '8080',
    ])->assertStatus(202);

    Http::assertSentCount(1);
    Http::assertSent(fn (Request $request): bool => $request->url() === 'https://clover.example/internal/sweep/run');
});

it('refuses to start a sweep when no origin is pinned', function (?string $origin): void {
    Http::fake();
    config(['clover.sweep.origin' => $origin]);

    $this->postJson('/internal/sweep', [], sweepAuth())
        ->assertStatus(503)
        ->assertExactJson(['started' => false]);

    Http::assertNothingSent();
})->with([[null], [''], ['/']]);

it('waits no longer than twenty seconds for the run route to answer', function (): void {
    $options = [];
    Http::fake(['*/internal/sweep/run' => function (Request $request, array $given) use (&$options) {
        $options = $given;

        return Http::response('', 200);
    }]);

    $this->postJson('/internal/sweep', [], sweepAuth())->assertStatus(202);

    expect($options['timeout'])->toBeGreaterThan(0)->toBeLessThanOrEqual(20)
        ->and($options['connect_timeout'])->toBeGreaterThan(0)->toBeLessThanOrEqual(20);
});

it('counts a timeout after the request went out as started, because the run outlives the wait', function (): void {
    Http::fake(['*/internal/sweep/run' => fn () => throw curlFailure(28, 214)]);

    $this->postJson('/internal/sweep', [], sweepAuth())
        ->assertStatus(202)
        ->assertExactJson(['started' => true]);
});

/**
 * A timeout is for the whole exchange, so one that fires in DNS, connect or
 * TLS looks like the expected one and means the run was never asked.
 */
it('does not call a call that never went out started', function (ConnectionException $failure): void {
    Http::fake(['*/internal/sweep/run' => fn () => throw $failure]);
    Log::spy();

    $this->postJson('/internal/sweep', [], sweepAuth())
        ->assertStatus(502)
        ->assertExactJson(['started' => false]);

    Log::shouldHaveReceived('error')->atLeast()->once();
})->with([
    'timed out before anything was sent' => fn () => curlFailure(28, 0),
    'connection refused' => fn () => curlFailure(7, 0),
    'could not resolve the host' => fn () => curlFailure(6, 0),
    'TLS handshake failed' => fn () => curlFailure(35, 0),
    'refused, though bytes are counted' => fn () => curlFailure(7, 214),
    'no account of what happened' => fn () => new ConnectionException('unknown'),
]);

it('does not hold the lock after asking whether a sweep is running', function (): void {
    Http::fake(['*/internal/sweep/run' => Http::response('', 200)]);

    $this->postJson('/internal/sweep', [], sweepAuth())->assertStatus(202);

    expect(Cache::lock('clover.sweep', 600)->get())->toBeTrue();
});

it('says so when the run route refuses the call', function (): void {
    Http::fake(['*/internal/sweep/run' => Http::response('', 401)]);

    $this->postJson('/internal/sweep', [], sweepAuth())
        ->assertStatus(502)
        ->assertExactJson(['started' => false]);
});

it('answers 409 when the run route finds a sweep already going', function (): void {
    Http::fake(['*/internal/sweep/run' => Http::response(['running' => true], 409)]);

    $this->postJson('/internal/sweep', [], sweepAuth())
        ->assertStatus(409)
        ->assertExactJson(['running' => true]);
});

it('runs the sync on the run route and logs how it ended', function (): void {
    fakeFourChan();
    Log::spy();

    $this->postJson('/internal/sweep/run', [], sweepAuth())
        ->assertOk()
        ->assertExactJson(['ok' => true]);

    expect(Board::query()->count())->toBeGreaterThan(0);
    Log::shouldHaveReceived('info')->withArgs(fn (string $message, array $context): bool => $context === ['exit_code' => 0]);
});

it('reports a failed sync as a 500 and says nothing more', function (): void {
    Http::fake(['a.4cdn.org/*' => Http::response('', 500)]);
    Log::spy();

    $this->postJson('/internal/sweep/run', [], sweepAuth())
        ->assertStatus(500)
        ->assertExactJson(['ok' => false]);

    Log::shouldHaveReceived('error')->withArgs(fn (string $message, array $context): bool => $context === ['exit_code' => 1]);
});

it('releases the lock once the run has finished', function (): void {
    fakeFourChan();

    $this->postJson('/internal/sweep/run', [], sweepAuth())->assertOk();

    expect(Cache::lock('clover.sweep', 600)->get())->toBeTrue();
});

it('releases the lock when the sync throws', function (): void {
    Http::fake(['a.4cdn.org/*' => fn () => throw new RuntimeException('boom')]);

    $this->postJson('/internal/sweep/run', [], sweepAuth())->assertStatus(500);

    expect(Cache::lock('clover.sweep', 600)->get())->toBeTrue();
});
