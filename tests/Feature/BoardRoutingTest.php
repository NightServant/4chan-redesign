<?php

declare(strict_types=1);

use App\Models\Board;
use App\Models\Thread;
use App\Support\RoutableBoards;

/**
 * Board and thread URLs keep the imageboard's own shape: `/g/` for a board and
 * `/g/109522303` for a thread.
 *
 * That shape collides with every other single-segment route on the site, so
 * the board parameter is constrained to known slugs. Without the constraint
 * `/rules` would resolve as a board named "rules" and shadow the real page.
 * These tests pin both halves: real slugs resolve, and the site's own pages
 * keep winning.
 *
 * The constraint and the board's existence are now two separate things, which
 * they were not while the slug list was hardcoded. A slug can be routable and
 * still 404 — because the board is not synced, or because this anon may not
 * see it. So these tests create the boards they ask for rather than assuming
 * seven of them are always there.
 */
beforeEach(function (): void {
    RoutableBoards::forget();
});

it('serves a board page for each known slug', function (): void {
    foreach (config('clover.fallback_boards') as $slug) {
        Board::factory()->slug($slug)->create();
    }

    foreach (config('clover.fallback_boards') as $slug) {
        $this->get("/{$slug}")->assertOk();
    }
});

it('does not treat an unknown slug as a board', function (): void {
    $this->get('/notaboard')->assertNotFound();
});

/**
 * A routable slug with no board behind it is a 404, not a blank 200.
 *
 * This is the descendant of the defect that started `BoardCatalogueTest`: a
 * slug the router accepted with no data behind it used to render an empty
 * page. It must fail as a real not-found.
 */
it('does not serve a routable slug that has no board', function (): void {
    expect(RoutableBoards::slugs())->toContain('g');

    $this->get('/g')->assertNotFound();
});

it('never shadows the site pages that share the URL shape', function (string $uri): void {
    $this->get($uri)->assertOk();
})->with(['/popular', '/latest', '/communities', '/rules', '/faq', '/terms']);

it('serves a thread page under its board', function (): void {
    $board = Board::factory()->slug('g')->create();
    $thread = Thread::factory()->for($board)->create();

    $this->get("/g/{$thread->no}")->assertOk();
});

/**
 * A post number matching nothing is the ordinary case on an imageboard, where
 * threads are pruned constantly. The page renders its own not-found state, so
 * the response is a 200 carrying a null thread rather than a 404.
 */
it('serves the thread page for a post number that matches nothing', function (): void {
    Board::factory()->slug('g')->create();

    $this->get('/g/58210441')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('thread')->where('thread', null));
});

it('rejects a thread number that is not a number', function (): void {
    Board::factory()->slug('g')->create();

    $this->get('/g/not-a-post')->assertNotFound();
});
