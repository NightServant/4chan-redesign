<?php

declare(strict_types=1);

use App\Models\Board;
use App\Models\Thread;
use App\Models\User;
use App\Support\RoutableBoards;

/**
 * Boards 4chan marks not worksafe are hidden unless an anon opts in.
 *
 * The preference is account-level and defaults to false, so a signed-out
 * visitor always gets the filtered view. That is the correct answer for them
 * rather than a fallback: every public surface has to work without an account.
 *
 * Task 10 shipped this filter on the directory listing only. Direct access to
 * `/{board}` and `/{board}/{thread}` was never gated, which was harmless while
 * the fixtures held seven worksafe boards and is a real hole the moment 24
 * genuinely adult boards are ingested. These tests close it and keep it closed.
 */
beforeEach(function (): void {
    RoutableBoards::forget();
});

function matureBoard(string $slug = 'b'): Board
{
    return Board::factory()->slug($slug)->notWorksafe()->create();
}

it('hides a not-worksafe board from an anon who has not opted in', function (): void {
    matureBoard();

    $this->get('/b')->assertNotFound();
});

it('shows a not-worksafe board to an anon who has opted in', function (): void {
    matureBoard();

    $user = User::factory()->create(['shows_mature_boards' => true]);

    $this->actingAs($user)->get('/b')->assertOk();
});

it('hides a not-worksafe board from a signed-in anon who has not opted in', function (): void {
    matureBoard();

    $user = User::factory()->create(['shows_mature_boards' => false]);

    $this->actingAs($user)->get('/b')->assertNotFound();
});

/**
 * A 404 and not a 403. A 403 says "this exists and you may not see it", which
 * confirms the board's existence to precisely the anon who asked not to be
 * shown boards like it. There is nothing there, as far as this request goes.
 */
it('answers a hidden board with 404 rather than 403', function (): void {
    matureBoard();

    $this->get('/b')->assertStatus(404);
});

it('hides threads on a not-worksafe board', function (): void {
    $board = matureBoard();
    $thread = Thread::factory()->for($board)->create();

    $this->get("/b/{$thread->no}")->assertNotFound();
});

it('keeps a worksafe board reachable by everyone', function (): void {
    Board::factory()->slug('g')->create();

    $this->get('/g')->assertOk();
});

/**
 * The gate has to hold on every surface that lists boards or threads, not only
 * on the two that take a slug in the URL. A board hidden from its own page and
 * still named in the feed, the directory or the homepage grid is not hidden.
 */
it('keeps hidden boards out of the directory', function (): void {
    matureBoard();
    Board::factory()->slug('g')->create();

    $this->get('/communities')->assertInertia(
        fn ($page) => $page
            ->component('communities')
            ->has('boards', 1)
            ->where('boards.0.slug', '/g/'),
    );
});

it('lists hidden boards in the directory once an anon opts in', function (): void {
    matureBoard();
    Board::factory()->slug('g')->create();

    $user = User::factory()->create(['shows_mature_boards' => true]);

    $this->actingAs($user)->get('/communities')->assertInertia(
        fn ($page) => $page->component('communities')->has('boards', 2),
    );
});

it('keeps threads from hidden boards out of the feed', function (): void {
    $hidden = matureBoard();
    $visible = Board::factory()->slug('g')->create();

    Thread::factory()->for($hidden)->create();
    Thread::factory()->for($visible)->create();

    $this->get('/popular')->assertInertia(
        fn ($page) => $page
            ->component('feed')
            ->has('threads', 1)
            ->where('threads.0.board', '/g/'),
    );
});

it('keeps hidden boards off the homepage', function (): void {
    $hidden = matureBoard();
    $visible = Board::factory()->slug('g')->create();

    Thread::factory()->for($hidden)->create();
    Thread::factory()->for($visible)->create();

    $this->get('/')->assertInertia(
        fn ($page) => $page
            ->component('welcome')
            ->has('boards', 1)
            ->has('threads', 1)
            ->where('boards.0.slug', '/g/'),
    );
});

/**
 * The mark, as distinct from the gate.
 *
 * Hiding is `worksafe`'s job and it happens in the query. This is the other
 * half: an anon who has opted into these boards still has to be told which is
 * which before they open one somewhere public, so the flag travels with every
 * board and every thread rather than being inferred in the browser.
 */
it('marks a not-worksafe board and its threads on the wire', function (): void {
    /* A slug from `clover.fallback_boards`: the board route is constrained to
       known slugs, and a fresh test database has no cached list yet. */
    $adult = Board::factory()->slug('x')->state(['worksafe' => false])->create();
    Thread::factory()->for($adult)->create();

    $user = User::factory()->create(['shows_mature_boards' => true]);

    $this->actingAs($user)->get('/x')->assertInertia(
        fn ($page) => $page
            ->where('board.nsfw', true)
            ->where('threads.0.nsfw', true),
    );
});

it('does not mark a worksafe board', function (): void {
    $board = Board::factory()->slug('g')->create();
    Thread::factory()->for($board)->create();

    $this->get('/g')->assertInertia(
        fn ($page) => $page
            ->where('board.nsfw', false)
            ->where('threads.0.nsfw', false),
    );
});
