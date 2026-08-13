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

/** `search/suggest` must not be swallowed by the board route or the page route. */
it('keeps the suggest endpoint distinct from the page', function (): void {
    searchFixture();

    $this->get('/search/suggest?q=g')->assertHeader('content-type', 'application/json');
});
