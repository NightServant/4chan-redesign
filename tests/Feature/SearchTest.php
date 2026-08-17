<?php

declare(strict_types=1);

use App\Models\Board;
use App\Models\Post;
use App\Models\Thread;
use App\Models\User;

/**
 * Search, over this application's database.
 *
 * There is no search endpoint on 4chan and a browser could not call one if
 * there were, so what is searchable is what has been synced.
 */
function searchFixture(): array
{
    $tech = Board::factory()->slug('g')->create(['title' => 'Technology']);
    $adult = Board::factory()->slug('d')->state(['worksafe' => false])->create(['title' => 'Hentai']);

    $thread = Thread::factory()->for($tech)->create(['subject' => 'RISC-V laptops']);
    Post::factory()->for($thread)->op()->create(['body' => 'Compiling LLVM takes 40 minutes']);

    $hidden = Thread::factory()->for($adult)->create(['subject' => 'RISC-V but adult']);
    Post::factory()->for($hidden)->op()->create();

    return [$tech, $adult, $thread];
}

it('finds a board by its slug', function (): void {
    searchFixture();

    $this->getJson('/search/suggest?q=g')
        ->assertOk()
        ->assertJsonPath('boards.0.slug', '/g/');
});

it('finds a board by its title', function (): void {
    searchFixture();

    $this->getJson('/search/suggest?q=Technology')
        ->assertOk()
        ->assertJsonPath('boards.0.name', 'Technology');
});

it('finds a thread by its subject', function (): void {
    searchFixture();

    $this->getJson('/search/suggest?q=RISC')
        ->assertOk()
        ->assertJsonPath('threads.0.title', 'RISC-V laptops');
});

/** The opening post is the thread's body, so it has to be searchable as one. */
it('finds a thread by the text of its opening post', function (): void {
    searchFixture();

    $this->getJson('/search/suggest?q=LLVM')
        ->assertOk()
        ->assertJsonPath('threads.0.title', 'RISC-V laptops');
});

/**
 * The mature gate is on reading, so it has to be on searching too. Without
 * this, a hidden board's threads stay reachable by anyone who guesses a word
 * in one of their subjects.
 */
it('hides mature boards and their threads from a signed-out anon', function (): void {
    searchFixture();

    $response = $this->getJson('/search/suggest?q=RISC')->assertOk();

    expect(collect($response->json('threads'))->pluck('title'))
        ->not->toContain('RISC-V but adult');

    $this->getJson('/search/suggest?q=Hentai')
        ->assertOk()
        ->assertJsonCount(0, 'boards');
});

it('shows mature boards to an anon who opted in', function (): void {
    searchFixture();

    $user = User::factory()->create(['shows_mature_boards' => true]);

    $this->actingAs($user)
        ->getJson('/search/suggest?q=Hentai')
        ->assertOk()
        ->assertJsonPath('boards.0.slug', '/d/');
});

/**
 * `%` and `_` are wildcards in a `LIKE` pattern. Unescaped, searching for `%`
 * returns the entire database.
 */
it('treats a wildcard as a literal character', function (): void {
    searchFixture();

    $this->getJson('/search/suggest?q=%')
        ->assertOk()
        ->assertJsonCount(0, 'boards')
        ->assertJsonCount(0, 'threads');
});

/** An empty query offers the busiest boards rather than nothing at all. */
it('suggests boards before anything has been typed', function (): void {
    searchFixture();

    $response = $this->getJson('/search/suggest?q=')->assertOk();

    expect($response->json('boards'))->not->toBeEmpty();
    expect($response->json('threads'))->toBe([]);
});

it('renders the results page for a query', function (): void {
    searchFixture();

    $this->get('/search?q=RISC')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('search')
            ->where('query', 'RISC')
            ->has('threads', 1));
});

it('renders the results page with no query without erroring', function (): void {
    $this->get('/search')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('search')->where('query', ''));
});

/**
 * The empty-query suggestions screen below `md` (task 6) reads the busiest
 * boards straight off the page's own props rather than fetching them
 * client-side a second time -- the same query `suggest` already runs for an
 * empty query, shared rather than written twice. `boards` and `threads`
 * stay empty for an empty query either way: that prop pair drives the
 * unrelated, unchanged results sections at `md` and up, and changing what
 * they hold for an empty query would change what that view shows.
 */
it('sends the busiest boards to the search page, matching what suggest sends for an empty query', function (): void {
    searchFixture();

    $suggested = $this->getJson('/search/suggest?q=')
        ->assertOk()
        ->json('boards');

    $this->get('/search')
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('search')
                ->where('query', '')
                ->has('boards', 0)
                ->has('threads', 0)
                ->where('busiestBoards.0.slug', $suggested[0]['slug'])
        );
});

it('sends the busiest boards for a search with a query too, unaffected by it', function (): void {
    searchFixture();

    $this->get('/search?q=RISC')
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('search')
                ->has('busiestBoards')
        );
});

/** `search/suggest` must not be swallowed by the board route or the page route. */
it('keeps the suggest endpoint distinct from the page', function (): void {
    searchFixture();

    $this->get('/search/suggest?q=g')->assertHeader('content-type', 'application/json');
});

/**
 * Tabs, sort and time (task 7).
 *
 * Two threads on one board, each with an opening post and one reply, and
 * every body matching the same term — so a tab that says it holds replies
 * and quietly includes the OP is caught by the count rather than passing on
 * a fixture where the OP happened not to match.
 *
 * @return array{0: Board, 1: Thread, 2: Thread}
 */
function tabFixture(): array
{
    $tech = Board::factory()->slug('g')->create(['title' => 'Technology']);

    $old = Thread::factory()->for($tech)->create([
        'subject' => 'RISC-V laptops',
        'replies_count' => 2,
        'posted_at' => now()->subMonths(2),
        'bumped_at' => now()->subMonths(2),
    ]);
    Post::factory()->for($old)->op()->create([
        'body' => 'RISC-V opening post, two months old',
        'posted_at' => now()->subMonths(2),
    ]);
    Post::factory()->for($old)->create([
        'body' => 'RISC-V reply from two months ago',
        'posted_at' => now()->subMonths(2),
    ]);

    $fresh = Thread::factory()->for($tech)->create([
        'subject' => null,
        'replies_count' => 400,
        'posted_at' => now()->subHours(3),
        'bumped_at' => now()->subHour(),
    ]);
    Post::factory()->for($fresh)->op()->create([
        'body' => 'RISC-V opening post from today',
        'posted_at' => now()->subHours(3),
    ]);
    Post::factory()->for($fresh)->create([
        'body' => 'RISC-V reply from today',
        'posted_at' => now()->subHour(),
    ]);

    return [$tech, $old, $fresh];
}

it('defaults to the all tab, relevance and all time', function (): void {
    tabFixture();

    $this->get('/search?q=RISC')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('search')
            ->where('type', 'all')
            ->where('sort', 'relevant')
            ->where('time', 'all'));
});

it('carries the tab, the sort and the time back from the URL', function (): void {
    tabFixture();

    $this->get('/search?q=RISC&type=comments&sort=latest&time=week')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('type', 'comments')
            ->where('sort', 'latest')
            ->where('time', 'week'));
});

/**
 * The comments tab is replies and only replies. Every body in the fixture
 * matches, so an implementation that forgets `is_op` returns four rows here
 * rather than two.
 */
it('searches replies on the comments tab and never the opening post', function (): void {
    tabFixture();

    $response = $this->get('/search?q=RISC&type=comments')->assertOk();

    $response->assertInertia(fn ($page) => $page
        ->has('comments', 2)
        ->has('threads', 0)
        ->has('boards', 0));

    expect(collect($response->viewData('page')['props']['comments'])->pluck('body'))
        ->each->toContain('reply');
});

it('sends a reply with the thread and board it sits in', function (): void {
    tabFixture();

    $this->get('/search?q=today&type=comments')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('comments', 1)
            ->where('comments.0.board', '/g/')
            ->where('comments.0.boardName', 'Technology')
            ->has('comments.0.threadNo')
            ->has('comments.0.threadTitle')
            ->has('comments.0.time')
            ->has('comments.0.no'));
});

/** The mature gate is on reading, so it is on searching replies too. */
it('hides replies on a mature board from a signed-out anon', function (): void {
    $adult = Board::factory()->slug('d')->state(['worksafe' => false])->create();
    $thread = Thread::factory()->for($adult)->create();
    Post::factory()->for($thread)->op()->create(['body' => 'opening']);
    Post::factory()->for($thread)->create(['body' => 'RISC-V but adult']);

    $this->get('/search?q=RISC&type=comments')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('comments', 0));

    $user = User::factory()->create(['shows_mature_boards' => true]);

    $this->actingAs($user)
        ->get('/search?q=RISC&type=comments')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('comments', 1));
});

it('returns threads alone on the posts tab', function (): void {
    tabFixture();

    $this->get('/search?q=RISC&type=posts')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('threads', 2)
            ->has('boards', 0)
            ->has('comments', 0));
});

it('returns boards alone on the communities tab', function (): void {
    tabFixture();

    $this->get('/search?q=Technology&type=communities')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('boards', 1)
            ->has('threads', 0)
            ->has('comments', 0));
});

it('bounds each section on the all tab rather than returning a whole page of one', function (): void {
    [$tech] = tabFixture();

    foreach (range(1, 6) as $index) {
        $thread = Thread::factory()->for($tech)->create(['subject' => "RISC-V thread {$index}"]);
        Post::factory()->for($thread)->op()->create(['body' => 'RISC-V']);
        Post::factory()->for($thread)->create(['body' => 'RISC-V reply']);
    }

    $this->get('/search?q=RISC')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('threads', 3)
            ->has('comments', 3));

    $this->get('/search?q=RISC&type=posts')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('threads', 8));
});

it('falls back rather than erroring on an unknown tab, sort or time', function (): void {
    tabFixture();

    $this->get('/search?q=RISC&type=videos&sort=top&time=decade')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('type', 'all')
            ->where('sort', 'relevant')
            ->where('time', 'all'));
});

/**
 * Reddit's "Top" has no source here — Clover has no votes — and "Most
 * replies" is the honest replacement, which means it is honest only where
 * there are replies to count. Asked for on a tab that cannot answer it, the
 * server reports the sort it actually applied rather than echoing one the
 * page would then draw as selected.
 */
it('reports relevance when most replies is asked for where it cannot apply', function (): void {
    tabFixture();

    foreach (['comments', 'communities'] as $type) {
        $this->get("/search?q=RISC&type={$type}&sort=replies")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('sort', 'relevant'));
    }

    $this->get('/search?q=RISC&type=posts&sort=replies')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('sort', 'replies'));
});

it('orders threads by the latest bump, by reply count, and by relevance', function (): void {
    tabFixture();

    $titles = fn (string $sort): array => collect(
        $this->get("/search?q=RISC&type=posts&sort={$sort}")
            ->assertOk()
            ->viewData('page')['props']['threads']
    )->pluck('title')->all();

    /* Bumped an hour ago, against two months. */
    expect($titles('latest')[0])->toBe('RISC-V opening post from today');

    /* 400 replies against 2. */
    expect($titles('replies')[0])->toBe('RISC-V opening post from today');

    /* The subject says it, rather than only the body — the same rule that
       puts a slug match above a description match for a board. */
    expect($titles('relevant')[0])->toBe('RISC-V laptops');
});

it('orders replies by recency on latest', function (): void {
    tabFixture();

    $bodies = collect(
        $this->get('/search?q=RISC&type=comments&sort=latest')
            ->assertOk()
            ->viewData('page')['props']['comments']
    )->pluck('body');

    expect($bodies->first())->toContain('today');
});

it('orders boards by their most recent activity on latest', function (): void {
    $quiet = Board::factory()->slug('po')->create(['title' => 'Papercraft matters']);
    Thread::factory()->for($quiet)->create(['bumped_at' => now()->subYear()]);

    $busy = Board::factory()->slug('wg')->create(['title' => 'Wallpapers matter']);
    Thread::factory()->for($busy)->create(['bumped_at' => now()->subMinute()]);

    $response = $this->get('/search?q=matter&type=communities&sort=latest')->assertOk();

    expect(collect($response->viewData('page')['props']['boards'])->pluck('slug')->first())
        ->toBe('/wg/');
});

it('filters threads and replies by time', function (): void {
    tabFixture();

    $this->get('/search?q=RISC&type=posts&time=today')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('threads', 1));

    $this->get('/search?q=RISC&type=comments&time=week')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('comments', 1));

    $this->get('/search?q=RISC&type=posts&time=all')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('threads', 2));
});

/**
 * A board's `created_at` is when this mirror first saw it, which means
 * nothing to an anon, so the time filter does not apply to communities and
 * the page hides the control. The server has to agree: filtering here would
 * empty a tab whose control is not on screen to undo it.
 */
it('does not apply the time filter to communities', function (): void {
    $board = Board::factory()->slug('g')->create(['title' => 'Technology']);
    Thread::factory()->for($board)->create(['bumped_at' => now()->subYear()]);

    $this->get('/search?q=Technology&type=communities&time=today')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('boards', 1));
});

it('resolves every combination of tab, sort and time', function (): void {
    tabFixture();

    foreach (['all', 'posts', 'communities', 'comments'] as $type) {
        foreach (['relevant', 'latest', 'replies'] as $sort) {
            foreach (['all', 'today', 'week', 'month'] as $time) {
                $this->get("/search?q=RISC&type={$type}&sort={$sort}&time={$time}")
                    ->assertOk()
                    ->assertInertia(fn ($page) => $page
                        ->component('search')
                        ->has('boards')
                        ->has('threads')
                        ->has('comments'));
            }
        }
    }
});
