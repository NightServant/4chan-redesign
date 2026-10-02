<?php

declare(strict_types=1);

use App\Models\Board;
use App\Models\Bookmark;
use App\Models\Post;
use App\Models\Thread;
use App\Support\RoutableBoards;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Sleep;
use Inertia\Testing\AssertableInertia;
use Tests\Feature\Sync\Fixture;

/**
 * Opening a board or a thread refetches it from 4chan when the stored copy is
 * stale. The flag is on for these and off everywhere else, so none of the
 * other page tests can reach the network.
 *
 * Every test goes through a real request to the page, because the behaviour is
 * the page's: that it fetches before reading, that it never fails because the
 * fetch did, and that it asks no more often than the windows allow.
 */
beforeEach(function (): void {
    config(['clover.live_fetch' => true]);
    Sleep::fake();
    RoutableBoards::forget();
    Cache::flush();
});

function liveBoard(): Board
{
    return Board::factory()->slug('g')->create();
}

function liveThread(Board $board, array $state = []): Thread
{
    return Thread::factory()->for($board)->create(['no' => 109514275, ...$state]);
}

function fakeUpstream(mixed $catalog = null, mixed $thread = null): void
{
    Http::fake([
        'a.4cdn.org/g/catalog.json' => $catalog ?? Http::response(Fixture::raw('g-catalog.json')),
        'a.4cdn.org/g/thread/*' => $thread ?? Http::response(Fixture::raw('g-thread-109514275.json')),
    ]);
}

function sentTo(string $path): int
{
    return Http::recorded(fn (Request $request): bool => str_ends_with($request->url(), $path))->count();
}

describe('a board', function (): void {
    it('is fetched when its catalog is stale, and the new threads are rendered', function (): void {
        $board = liveBoard();
        fakeUpstream();

        $this->get('/g')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->component('board')->has('threads', 6));

        expect(sentTo('/g/catalog.json'))->toBe(1)
            ->and($board->threads()->count())->toBe(6);
    });

    it('is not fetched again inside the window, and is after it', function (): void {
        liveBoard();
        fakeUpstream();

        $this->get('/g')->assertOk();
        $this->get('/g')->assertOk();

        expect(sentTo('/g/catalog.json'))->toBe(1);

        $this->travel(61)->seconds();
        $this->get('/g')->assertOk();

        expect(sentTo('/g/catalog.json'))->toBe(2);
    });

    it('is not fetched at all with the flag off', function (): void {
        config(['clover.live_fetch' => false]);
        liveBoard();
        fakeUpstream();

        $this->get('/g')->assertOk();

        Http::assertNothingSent();
    });

    it('sends If-Modified-Since on the second fetch, and a 304 changes nothing', function (): void {
        $board = liveBoard();
        Http::fake(fn (Request $request) => $request->hasHeader('If-Modified-Since')
            ? Http::response('', 304)
            : Http::response(Fixture::raw('g-catalog.json'), 200, ['Last-Modified' => 'Thu, 19 Mar 2026 16:38:15 GMT']));

        $this->get('/g')->assertOk();
        $this->travel(61)->seconds();
        $this->get('/g')->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->has('threads', 6));

        Http::assertSent(fn (Request $request): bool => $request->hasHeader('If-Modified-Since'));
        expect($board->threads()->count())->toBe(6);
    });

    it('prunes the threads a fetched catalog no longer lists, except bookmarked ones', function (): void {
        $board = liveBoard();
        $gone = Thread::factory()->for($board)->create(['no' => 100]);
        $saved = Thread::factory()->for($board)->create(['no' => 101]);
        Bookmark::factory()->create(['thread_id' => $saved->id]);
        fakeUpstream();

        $this->get('/g')->assertOk();

        expect(Thread::query()->whereKey($gone->id)->exists())->toBeFalse()
            ->and(Thread::query()->whereKey($saved->id)->exists())->toBeTrue();
    });

    it('renders the stored threads when upstream is down', function (mixed $failure): void {
        $board = liveBoard();
        $stored = Thread::factory()->for($board)->create(['no' => 100]);
        fakeUpstream(catalog: $failure);

        $this->get('/g')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->has('threads', 1));

        expect(Thread::query()->whereKey($stored->id)->exists())->toBeTrue();
    })->with([
        'a server error' => fn () => Http::response('', 503),
        'a timeout' => fn () => fn () => throw new ConnectionException('cURL error 28: timed out'),
        'a body that is not json' => fn () => Http::response('<html>attention required</html>'),
        'a 404' => fn () => Http::response('', 404),
    ]);

    it('does not ask again inside the window after a failure', function (): void {
        liveBoard();
        fakeUpstream(catalog: Http::response('', 503));

        $this->get('/g')->assertOk();
        $this->get('/g')->assertOk();

        expect(sentTo('/g/catalog.json'))->toBe(1);
    });

    it('renders the stored threads while another request holds the refresh', function (): void {
        $board = liveBoard();
        Thread::factory()->for($board)->create(['no' => 100]);
        fakeUpstream();

        $lock = Cache::lock('clover.live.lock.board.g', 30);
        expect($lock->get())->toBeTrue();

        $this->get('/g')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->has('threads', 1));

        Http::assertNothingSent();
    });
});

describe('a thread', function (): void {
    it('is fetched when its posts were never synced, and the replies are rendered', function (): void {
        $thread = liveThread(liveBoard());
        fakeUpstream();

        $this->get('/g/109514275')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('thread')
                ->where('comments', fn ($comments): bool => count($comments) > 0));

        expect(sentTo('/g/thread/109514275.json'))->toBe(1)
            ->and($thread->posts()->count())->toBe(6)
            ->and($thread->fresh()->posts_synced_at)->not->toBeNull();
    });

    it('is fetched when its posts are more than 30 seconds old', function (): void {
        liveThread(liveBoard(), ['posts_synced_at' => now()->subSeconds(31)]);
        fakeUpstream();

        $this->get('/g/109514275')->assertOk();

        expect(sentTo('/g/thread/109514275.json'))->toBe(1);
    });

    it('is not fetched when its posts are fresh', function (): void {
        liveThread(liveBoard(), ['posts_synced_at' => now()->subSeconds(5)]);
        fakeUpstream();

        $this->get('/g/109514275')->assertOk();

        Http::assertNothingSent();
    });

    it('is not fetched at all with the flag off', function (): void {
        config(['clover.live_fetch' => false]);
        liveThread(liveBoard());
        fakeUpstream();

        $this->get('/g/109514275')->assertOk();

        Http::assertNothingSent();
    });

    it('renders the stored copy when upstream is down', function (mixed $failure): void {
        $thread = liveThread(liveBoard());
        Post::factory()->op()->create(['thread_id' => $thread->id, 'no' => 109514275, 'body' => 'stored opening post']);
        fakeUpstream(thread: $failure);

        $this->get('/g/109514275')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('thread')
                ->where('thread.title', fn ($title): bool => $title !== null));

        expect($thread->posts()->count())->toBe(1)
            ->and($thread->fresh()->posts_synced_at)->toBeNull();
    })->with([
        'a server error' => fn () => Http::response('', 503),
        'a timeout' => fn () => fn () => throw new ConnectionException('cURL error 28: timed out'),
        'a body that is not json' => fn () => Http::response('<html>attention required</html>'),
        'a 404' => fn () => Http::response('', 404),
    ]);

    it('does not ask again inside the window after a 404', function (): void {
        liveThread(liveBoard());
        fakeUpstream(thread: Http::response('', 404));

        $this->get('/g/109514275')->assertOk();
        $this->get('/g/109514275')->assertOk();

        expect(sentTo('/g/thread/109514275.json'))->toBe(1);
    });

    it('renders the stored copy while another request holds the refresh', function (): void {
        $thread = liveThread(liveBoard());
        fakeUpstream();

        $lock = Cache::lock("clover.live.lock.thread.{$thread->id}", 30);
        expect($lock->get())->toBeTrue();

        $this->get('/g/109514275')->assertOk();

        Http::assertNothingSent();
    });

    it('does not fetch a thread that is not stored', function (): void {
        liveBoard();
        fakeUpstream();

        $this->get('/g/109514275')->assertOk();

        Http::assertNothingSent();
    });
});
