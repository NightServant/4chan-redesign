<?php

declare(strict_types=1);

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\Board;
use App\Models\Bookmark;
use App\Models\Post;
use App\Models\Thread;
use App\Support\RoutableBoards;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Http\Request as HttpRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Sleep;
use Illuminate\Testing\TestResponse;
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
            ->assertInertia(fn (AssertableInertia $page) => $page->component('board')->has('threads.data', 6));

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
            ->assertInertia(fn (AssertableInertia $page) => $page->has('threads.data', 6));

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
            ->assertInertia(fn (AssertableInertia $page) => $page->has('threads.data', 1));

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
            ->assertInertia(fn (AssertableInertia $page) => $page->has('threads.data', 1));

        Http::assertNothingSent();
    });
});

/**
 * The two props a stale thread page defers, in the one group the client waits
 * on together. `thread.tsx` names the same two in `<Deferred data>`.
 */
const LIVE_PROPS = ['comments', 'liveThread'];

/**
 * The headers of a request as the Inertia client makes it, at the asset
 * version the server is on.
 *
 * @param  array<string, string>  $extra
 * @return array<string, string>
 */
function inertiaHeaders(array $extra = []): array
{
    $version = (new HandleInertiaRequests)->version(new HttpRequest);

    return ['X-Inertia' => 'true', ...($version === null ? [] : ['X-Inertia-Version' => $version]), ...$extra];
}

/** What the client sends to follow up on the deferred group. */
function deferredGroupRequest(string $path): TestResponse
{
    return test()->get($path, inertiaHeaders([
        'X-Inertia-Partial-Component' => 'thread',
        'X-Inertia-Partial-Data' => implode(',', LIVE_PROPS),
    ]));
}

describe('a thread', function (): void {
    it('renders at once when its posts are stale, and the replies arrive in a deferred group', function (): void {
        $thread = liveThread(liveBoard(), ['posts_synced_at' => now()->subSeconds(31), 'replies_count' => 3]);
        Post::factory()->op()->create(['thread_id' => $thread->id, 'no' => 109514275, 'body' => 'stored opening post']);
        fakeUpstream();

        $this->get('/g/109514275')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('thread')
                ->where('thread.replies', 3)
                ->missingAll(LIVE_PROPS));

        Http::assertNothingSent();
    });

    it('fetches once when the deferred group is asked for, and returns the replies with fresh counts', function (): void {
        $thread = liveThread(liveBoard(), ['posts_synced_at' => now()->subSeconds(31), 'replies_count' => 3]);
        fakeUpstream();

        $this->get('/g/109514275')
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->loadDeferredProps('live', fn (AssertableInertia $reload) => $reload
                    ->where('comments', fn ($comments): bool => count($comments) > 0)
                    ->where('liveThread.replies', 292)
                    ->missing('thread')));

        expect(sentTo('/g/thread/109514275.json'))->toBe(1)
            ->and($thread->posts()->count())->toBe(6)
            ->and($thread->fresh()->replies_count)->toBe(292);
    });

    it('is fetched when its posts were never synced, and the replies are rendered', function (): void {
        $thread = liveThread(liveBoard());
        fakeUpstream();

        $this->get('/g/109514275')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('thread')
                ->reloadOnly(LIVE_PROPS, fn (AssertableInertia $reload) => $reload
                    ->where('comments', fn ($comments): bool => count($comments) > 0)));

        expect(sentTo('/g/thread/109514275.json'))->toBe(1)
            ->and($thread->posts()->count())->toBe(6)
            ->and($thread->fresh()->posts_synced_at)->not->toBeNull();
    });

    it('is fetched when its posts are more than 30 seconds old', function (): void {
        liveThread(liveBoard(), ['posts_synced_at' => now()->subSeconds(31)]);
        fakeUpstream();

        $this->get('/g/109514275')
            ->assertInertia(fn (AssertableInertia $page) => $page->reloadOnly(LIVE_PROPS));

        expect(sentTo('/g/thread/109514275.json'))->toBe(1);
    });

    it('renders the replies inline, with no upstream call, when its posts are fresh', function (): void {
        $thread = liveThread(liveBoard(), ['posts_synced_at' => now()->subSeconds(5)]);
        Post::factory()->op()->create(['thread_id' => $thread->id, 'no' => 109514275]);
        Post::factory()->create(['thread_id' => $thread->id, 'no' => 109514276]);
        fakeUpstream();

        $this->get('/g/109514275')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->has('comments', 1)
                ->where('liveThread', null));

        Http::assertNothingSent();
    });

    it('renders the replies inline and fetches nothing with the flag off', function (): void {
        config(['clover.live_fetch' => false]);
        liveThread(liveBoard());
        fakeUpstream();

        $this->get('/g/109514275')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->has('comments')
                ->where('liveThread', null));

        Http::assertNothingSent();
    });

    it('makes no upstream call for a prefetch, or for the page the browser first loads', function (): void {
        liveThread(liveBoard(), ['posts_synced_at' => now()->subSeconds(31)]);
        fakeUpstream();

        $this->get('/g/109514275')->assertOk();

        $this->get('/g/109514275', inertiaHeaders(['Purpose' => 'prefetch']))
            ->assertOk()
            ->assertJsonPath('component', 'thread')
            ->assertJsonPath('deferredProps.live', LIVE_PROPS);

        Http::assertNothingSent();
    });

    it('keeps the title and the social tags on the stored thread while the replies are deferred', function (): void {
        liveThread(liveBoard(), ['subject' => 'Stored subject', 'posts_synced_at' => now()->subSeconds(31), 'replies_count' => 3]);
        fakeUpstream();

        $html = $this->get('/g/109514275')->assertOk()->getContent();

        preg_match('/<title>(.*?)<\/title>/s', $html, $title);

        expect($title[1] ?? '')->toContain('Stored subject')
            ->and($html)->toContain('property="og:title"')
            ->and($html)->toContain('3 replies');

        Http::assertNothingSent();
    });

    it('answers the deferred group with fresh counts when another visitor refreshed in between', function (): void {
        $thread = liveThread(liveBoard(), ['posts_synced_at' => now()->subSeconds(31), 'replies_count' => 3]);
        fakeUpstream();

        $this->get('/g/109514275')->assertOk();

        /* The other visitor's follow-up got there first: the rows are fresh and the window is taken. */
        $thread->forceFill(['replies_count' => 292, 'posts_synced_at' => now()])->save();
        Cache::put("clover.live.thread.{$thread->id}", true, 30);

        deferredGroupRequest('/g/109514275')
            ->assertOk()
            ->assertJsonStructure(['props' => ['comments']])
            ->assertJsonPath('props.liveThread.replies', 292);

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
                ->where('thread.title', fn ($title): bool => $title !== null)
                ->reloadOnly(LIVE_PROPS, fn (AssertableInertia $reload) => $reload
                    ->has('comments', 0)
                    ->where('liveThread.title', fn ($title): bool => $title !== null)));

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

        $this->get('/g/109514275')
            ->assertInertia(fn (AssertableInertia $page) => $page->reloadOnly(LIVE_PROPS));
        /* Still stale -- the 404 stamped nothing -- so still deferred, and the follow-up finds the window taken. */
        $this->get('/g/109514275')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->missingAll(LIVE_PROPS)
                ->loadDeferredProps('live'));

        expect(sentTo('/g/thread/109514275.json'))->toBe(1);
    });

    it('still defers, and never answers inline, while another request holds the window and the lock', function (): void {
        $thread = liveThread(liveBoard(), ['replies_count' => 37]);
        Post::factory()->op()->create(['thread_id' => $thread->id, 'no' => 109514275]);
        fakeUpstream();

        /* What a signed-in reader's read-recording redirect meets: the page's own follow-up is mid-fetch. */
        $lock = Cache::lock("clover.live.lock.thread.{$thread->id}", 30);
        expect($lock->get())->toBeTrue();
        Cache::put("clover.live.thread.{$thread->id}", true, 30);

        $this->get('/g/109514275')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('thread.replies', 37)
                ->missingAll(LIVE_PROPS)
                ->loadDeferredProps('live', fn (AssertableInertia $reload) => $reload
                    ->has('comments', 0)
                    ->where('liveThread.replies', 37)));

        Http::assertNothingSent();
    });

    it('rescues the deferred group instead of failing the follow-up when answering it throws', function (): void {
        $thread = liveThread(liveBoard());
        Post::factory()->op()->create(['thread_id' => $thread->id, 'no' => 109514275]);
        Post::factory()->create(['thread_id' => $thread->id, 'no' => 109514276]);
        fakeUpstream();

        $this->get('/g/109514275')->assertOk();

        /* Reading the replies fails; the page's own opening post, read before, did not. */
        Event::listen('eloquent.retrieved: '.Post::class, function (Post $post): void {
            if (! $post->is_op) {
                throw new RuntimeException('database went away');
            }
        });

        deferredGroupRequest('/g/109514275')
            ->assertOk()
            ->assertJsonPath('rescuedProps', LIVE_PROPS)
            ->assertJsonMissingPath('props.comments')
            ->assertJsonMissingPath('props.liveThread');
    });

    it('does not fetch a thread that is not stored', function (): void {
        liveBoard();
        fakeUpstream();

        $this->get('/g/109514275')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->where('thread', null)->where('liveThread', null));

        Http::assertNothingSent();
    });
});
