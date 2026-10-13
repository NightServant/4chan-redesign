<?php

declare(strict_types=1);

use App\Models\Board;
use App\Models\Post;
use App\Models\Thread;
use App\Models\User;
use App\Support\RoutableBoards;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Sleep;
use Inertia\Inertia;

/**
 * The feed, a board and a search tab page through `Inertia::scroll()`.
 *
 * Page one is an ordinary visit. Every later page is the request the browser's
 * `<InfiniteScroll>` makes: a partial reload of the one prop, with the next
 * cursor (or page number) in the query and an append intent in a header. These
 * tests make that same request rather than a second ordinary visit, because
 * the merge labels the client acts on only ride on that response.
 */
beforeEach(function (): void {
    RoutableBoards::forget();
    Cache::flush();
});

/**
 * @return array<string, mixed>
 */
function firstPage(string $url): array
{
    return test()->get($url)->assertOk()->viewData('page');
}

/**
 * The follow-up request `<InfiniteScroll>` sends for the next page.
 *
 * @return array<string, mixed>
 */
function nextPage(string $url, string $prop, string $component, string $pageName, string $page): array
{
    $separator = str_contains($url, '?') ? '&' : '?';

    return test()->withHeaders([
        'X-Inertia' => 'true',
        'X-Inertia-Version' => Inertia::getVersion(),
        'X-Inertia-Partial-Component' => $component,
        'X-Inertia-Partial-Data' => $prop,
        'X-Inertia-Infinite-Scroll-Merge-Intent' => 'append',
    ])->get($url.$separator.http_build_query([$pageName => $page]))->assertOk()->json();
}

/**
 * @param  array<string, mixed>  $page
 * @return array<int, int|string>
 */
function ids(array $page, string $prop, string $key = 'id'): array
{
    return array_column($page['props'][$prop]['data'], $key);
}

function visibleBoard(string $slug = 'g'): Board
{
    return Board::factory()->slug($slug)->create();
}

describe('the feed', function (): void {
    it('pages 30 threads at a time on a cursor, with no overlap and no end marker left over', function (string $path, string $column): void {
        $board = visibleBoard();

        Thread::factory()->for($board)->count(45)->sequence(fn ($sequence): array => [
            'replies_count' => 100 + $sequence->index,
            'posted_at' => now()->subHours(100 - $sequence->index),
            'bumped_at' => now()->subMinutes(100 - $sequence->index),
        ])->create();

        $first = firstPage($path);
        $second = nextPage($path, 'threads', 'feed', 'cursor', $first['scrollProps']['threads']['nextPage']);

        expect($first['props']['threads']['data'])->toHaveCount(30)
            ->and($second['props']['threads']['data'])->toHaveCount(15)
            ->and(array_intersect(ids($first, 'threads'), ids($second, 'threads')))->toBe([])
            ->and($first['scrollProps']['threads']['pageName'])->toBe('cursor')
            ->and($second['scrollProps']['threads']['nextPage'])->toBeNull();

        $expected = Thread::query()->orderByDesc($column)->orderByDesc('id')->pluck('id')->all();

        expect([...ids($first, 'threads'), ...ids($second, 'threads')])->toBe($expected);
    })->with([
        'popular' => ['/popular', 'replies_count'],
        'latest' => ['/latest', 'posted_at'],
    ]);

    it('breaks ties on the id, so a run of equal sort keys is neither skipped nor repeated', function (): void {
        $board = visibleBoard();

        Thread::factory()->for($board)->count(70)->create(['replies_count' => 7]);

        $first = firstPage('/popular');
        $second = nextPage('/popular', 'threads', 'feed', 'cursor', $first['scrollProps']['threads']['nextPage']);
        $third = nextPage('/popular', 'threads', 'feed', 'cursor', $second['scrollProps']['threads']['nextPage']);

        $seen = [...ids($first, 'threads'), ...ids($second, 'threads'), ...ids($third, 'threads')];

        expect($seen)->toHaveCount(70)
            ->and(array_unique($seen))->toHaveCount(70)
            ->and($third['scrollProps']['threads']['nextPage'])->toBeNull();
    });

    it('does not repeat a thread that is bumped or opened between two requests', function (): void {
        $board = visibleBoard();

        $threads = Thread::factory()->for($board)->count(45)->sequence(fn ($sequence): array => [
            'bumped_at' => now()->subMinutes(100 - $sequence->index),
        ])->create();

        $this->actingAs(User::factory()->create());

        $first = firstPage('/dashboard');
        $cursor = $first['scrollProps']['threads']['nextPage'];

        /* One thread already on page one is bumped again, one that was waiting
           on page two is bumped past the cursor, and a new one is opened. All
           three move above the cursor: none can come back as a repeat. */
        $seenAlready = $first['props']['threads']['data'][5]['id'];
        $waiting = $threads->sortBy('bumped_at')->first();
        Thread::query()->whereKey($seenAlready)->update(['bumped_at' => now()]);
        $waiting->update(['bumped_at' => now()]);
        $opened = Thread::factory()->for($board)->create(['bumped_at' => now()]);

        $second = nextPage('/dashboard', 'threads', 'feed', 'cursor', $cursor);

        expect(array_intersect(ids($first, 'threads'), ids($second, 'threads')))->toBe([])
            ->and(ids($second, 'threads'))->not->toContain($seenAlready)
            ->and(ids($second, 'threads'))->not->toContain($waiting->id)
            ->and(ids($second, 'threads'))->not->toContain($opened->id);
    });

    it('asks the client to match appended threads on their id', function (): void {
        Thread::factory()->for(visibleBoard())->count(31)->create();

        $first = firstPage('/popular');
        $second = nextPage('/popular', 'threads', 'feed', 'cursor', $first['scrollProps']['threads']['nextPage']);

        expect($second['mergeProps'])->toContain('threads.data')
            ->and($second['matchPropsOn'])->toContain('threads.data.id');
    });

    it('keeps mature boards out of page two for a signed-out visitor', function (): void {
        $mature = Board::factory()->slug('b')->notWorksafe()->create();
        $visible = visibleBoard();

        /* The mature threads outrank every visible one, so a filter that only
           guarded page one would show them from the second request on. */
        Thread::factory()->for($mature)->count(40)->create(['replies_count' => 500]);
        Thread::factory()->for($visible)->count(35)->create(['replies_count' => 5]);

        $first = firstPage('/popular');
        $second = nextPage('/popular', 'threads', 'feed', 'cursor', $first['scrollProps']['threads']['nextPage']);

        $boards = array_unique([
            ...array_column($first['props']['threads']['data'], 'board'),
            ...array_column($second['props']['threads']['data'], 'board'),
        ]);

        expect($boards)->toBe(['/g/'])
            ->and($second['props']['threads']['data'])->toHaveCount(5);
    });
});

describe('saving a thread from a scrolled feed', function (): void {
    it('answers the redirect back with the shared props alone, so the loaded pages survive', function (): void {
        $thread = Thread::factory()->for(visibleBoard())->create();
        $this->actingAs(User::factory()->create());

        /* A visit first, which is what teaches Inertia this build's version. */
        firstPage('/popular');

        $response = $this->withHeaders([
            'X-Inertia' => 'true',
            'X-Inertia-Version' => Inertia::getVersion(),
            'X-Inertia-Partial-Component' => 'feed',
            'X-Inertia-Partial-Data' => 'auth',
            'Referer' => url('/popular'),
        ])->post("/threads/{$thread->id}/bookmark");

        /* The browser follows this redirect carrying the same headers. */
        $response->assertRedirect(url('/popular'));
        $response = $this->get('/popular')->assertOk();

        expect($response->json('component'))->toBe('feed')
            ->and($response->json('props'))->toHaveKey('auth')
            ->and($response->json('props'))->not->toHaveKey('threads')
            ->and($thread->bookmarks()->count())->toBe(1);
    });
});

describe('a board', function (): void {
    it('pages 40 threads at a time in bump order, with no overlap', function (): void {
        $board = visibleBoard();

        Thread::factory()->for($board)->count(55)->sequence(fn ($sequence): array => [
            'bumped_at' => now()->subMinutes(100 - $sequence->index),
        ])->create();

        $first = firstPage('/g');
        $second = nextPage('/g', 'threads', 'board', 'cursor', $first['scrollProps']['threads']['nextPage']);

        expect($first['props']['threads']['data'])->toHaveCount(40)
            ->and($second['props']['threads']['data'])->toHaveCount(15)
            ->and($second['scrollProps']['threads']['nextPage'])->toBeNull()
            ->and([...ids($first, 'threads'), ...ids($second, 'threads')])
            ->toBe($board->threads()->orderByDesc('bumped_at')->orderByDesc('id')->pluck('id')->all());
    });

    it('orders the replies tab by the board\'s most-replied threads, and page two carries on in that order', function (): void {
        $board = visibleBoard();

        /* Reply counts that run against bump order, so a tab that only
           re-sorted the first page of bumps would be caught out. */
        Thread::factory()->for($board)->count(55)->sequence(fn ($sequence): array => [
            'replies_count' => 10 + (($sequence->index * 7) % 55),
            'bumped_at' => now()->subMinutes(100 - $sequence->index),
        ])->create();

        $first = firstPage('/g?sort=replies');
        $second = nextPage('/g?sort=replies', 'threads', 'board', 'cursor', $first['scrollProps']['threads']['nextPage']);

        $expected = $board->threads()->orderByDesc('replies_count')->orderByDesc('id')->pluck('id')->all();

        expect($first['props']['sort'])->toBe('replies')
            ->and($first['props']['threads']['data'])->toHaveCount(40)
            ->and(array_column($first['props']['threads']['data'], 'replies'))
            ->toBe($board->threads()->orderByDesc('replies_count')->orderByDesc('id')->limit(40)->pluck('replies_count')->all())
            ->and([...ids($first, 'threads'), ...ids($second, 'threads')])->toBe($expected)
            ->and($second['scrollProps']['threads']['nextPage'])->toBeNull();
    });

    it('orders the new tab by post number, newest first, across pages', function (): void {
        $board = visibleBoard();

        Thread::factory()->for($board)->count(45)->sequence(fn ($sequence): array => [
            'no' => 500_000_000 + (($sequence->index * 13) % 45),
            'bumped_at' => now()->subMinutes($sequence->index),
        ])->create();

        $first = firstPage('/g?sort=new');
        $second = nextPage('/g?sort=new', 'threads', 'board', 'cursor', $first['scrollProps']['threads']['nextPage']);

        expect([...ids($first, 'threads', 'no'), ...ids($second, 'threads', 'no')])
            ->toBe($board->threads()->orderByDesc('no')->pluck('no')->all());
    });

    it('falls back to bump order for a sort it does not offer', function (): void {
        $board = visibleBoard();

        Thread::factory()->for($board)->count(3)->sequence(fn ($sequence): array => [
            'replies_count' => 100 - $sequence->index,
            'bumped_at' => now()->subMinutes(10 - $sequence->index),
        ])->create();

        $page = firstPage('/g?sort=bogus');

        expect($page['props']['sort'])->toBe('bumped')
            ->and(ids($page, 'threads'))
            ->toBe($board->threads()->orderByDesc('bumped_at')->orderByDesc('id')->pluck('id')->all());
    });

    it('still reports the whole board\'s thread count when only some are loaded', function (): void {
        Thread::factory()->for(visibleBoard())->count(45)->create();

        expect(firstPage('/g')['props']['board']['threads'])->toBe('45');
    });

    it('fetches from 4chan for the first page of any sort, never for a follow-up page', function (string $url): void {
        config(['clover.live_fetch' => true]);
        Sleep::fake();

        $board = visibleBoard();
        Thread::factory()->for($board)->count(45)->create(['synced_at' => now()->subHour()]);

        Http::fake(['a.4cdn.org/*' => Http::response([], 404)]);

        $first = firstPage($url);
        Http::assertSentCount(1);

        /* Past the window, so a request that did consult 4chan would send. */
        $this->travel(61)->seconds();
        Http::fake();

        nextPage($url, 'threads', 'board', 'cursor', $first['scrollProps']['threads']['nextPage']);

        Http::assertNothingSent();
    })->with(['/g', '/g?sort=new', '/g?sort=replies']);

    it('does not mistake a hand-typed cursor for a follow-up page', function (): void {
        config(['clover.live_fetch' => true]);
        Sleep::fake();

        visibleBoard();
        Http::fake(['a.4cdn.org/*' => Http::response([], 404)]);

        $this->get('/g?cursor=junk')->assertOk();

        Http::assertSentCount(1);
    });
});

describe('search', function (): void {
    it('pages the posts tab by page number and keeps the filters', function (): void {
        $board = visibleBoard();

        Thread::factory()->for($board)->count(45)->sequence(fn ($sequence): array => [
            'subject' => 'zebra '.$sequence->index,
            'bumped_at' => now()->subMinutes(100 - $sequence->index),
        ])->create();

        $url = '/search?q=zebra&type=posts&sort=latest&time=week';

        $first = firstPage($url);
        $second = nextPage($url, 'threads', 'search', 'page', (string) $first['scrollProps']['threads']['nextPage']);

        expect($first['props']['threads']['data'])->toHaveCount(40)
            ->and($second['props']['threads']['data'])->toHaveCount(5)
            ->and(array_intersect(ids($first, 'threads'), ids($second, 'threads')))->toBe([])
            ->and($second['scrollProps']['threads']['nextPage'])->toBeNull()
            ->and($second['props'])->not->toHaveKey('boards')
            ->and($second['matchPropsOn'])->toContain('threads.data.id');

        /* The follow-up carries the same query string, so the server answers
           it with the same type, sort and time. They come back on a full
           visit to the same URL: this checks the page-two URL itself. */
        $again = test()->flushHeaders()->get($url.'&page=2')->assertOk()->viewData('page');

        expect($again['props']['type'])->toBe('posts')
            ->and($again['props']['sort'])->toBe('latest')
            ->and($again['props']['time'])->toBe('week')
            ->and($again['props']['threads']['data'])->toHaveCount(5);
    });

    it('pages the comments tab', function (): void {
        $thread = Thread::factory()->for(visibleBoard())->create();

        Post::factory()->for($thread)->count(45)->sequence(fn ($sequence): array => [
            'body' => 'zebra reply '.$sequence->index,
            'posted_at' => now()->subMinutes(100 - $sequence->index),
        ])->create(['is_op' => false]);

        $first = firstPage('/search?q=zebra&type=comments');
        $second = nextPage('/search?q=zebra&type=comments', 'comments', 'search', 'page', (string) $first['scrollProps']['comments']['nextPage']);

        expect($first['props']['comments']['data'])->toHaveCount(40)
            ->and($second['props']['comments']['data'])->toHaveCount(5)
            ->and(array_intersect(ids($first, 'comments'), ids($second, 'comments')))->toBe([])
            ->and($second['scrollProps']['comments']['nextPage'])->toBeNull();
    });

    it('pages the communities tab, matching boards on their slug', function (): void {
        foreach (range(1, 45) as $number) {
            Board::factory()->slug('zz'.$number)->create(['title' => 'Zebra '.$number]);
        }

        $url = '/search?q=zebra&type=communities';
        $first = firstPage($url);
        $second = nextPage($url, 'boards', 'search', 'page', (string) $first['scrollProps']['boards']['nextPage']);

        expect($first['props']['boards']['data'])->toHaveCount(40)
            ->and($second['props']['boards']['data'])->toHaveCount(5)
            ->and(array_intersect(ids($first, 'boards', 'slug'), ids($second, 'boards', 'slug')))->toBe([])
            ->and($second['matchPropsOn'])->toContain('boards.data.slug');
    });

    it('says whether the All tab cut a section off, so its count can say "N+"', function (int $matches, bool $cut): void {
        Thread::factory()->for(visibleBoard())->count($matches)->sequence(fn ($sequence): array => [
            'subject' => 'zebra '.$sequence->index,
        ])->create();

        $page = firstPage('/search?q=zebra');

        expect($page['props']['threads'])->toHaveCount(min($matches, 3))
            ->and($page['props']['truncated'])->toBe($cut);
    })->with([
        'exactly three matches' => [3, false],
        'four matches' => [4, true],
        'eighty matches' => [80, true],
    ]);

    it('does not mark a tab of its own as cut off, because it pages instead', function (): void {
        Thread::factory()->for(visibleBoard())->count(80)->sequence(fn ($sequence): array => [
            'subject' => 'zebra '.$sequence->index,
        ])->create();

        expect(firstPage('/search?q=zebra&type=posts')['props']['truncated'])->toBeFalse();
    });

    it('does not page the All tab, whose sections are three-row slices', function (): void {
        Thread::factory()->for(visibleBoard())->count(10)->sequence(fn ($sequence): array => [
            'subject' => 'zebra '.$sequence->index,
        ])->create();

        $page = firstPage('/search?q=zebra');

        expect($page['props']['threads'])->toHaveCount(3)
            ->and($page['props']['threads'])->toHaveKey(0)
            ->and($page['scrollProps'] ?? [])->toBe([]);
    });
});
