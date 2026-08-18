<?php

declare(strict_types=1);

use App\Models\Board;
use App\Models\Post;
use App\Models\Thread;
use App\Support\RoutableBoards;

/**
 * A thread's replies as JSON, for the full-image viewer's drawer.
 *
 * The viewer opens from a feed row as well as from the thread page, and a row
 * carries no comments. Fetching on demand is the alternative to the feed
 * sending every thread's tree with the page — tens of thousands of rows for
 * the handful anyone opens.
 */
beforeEach(function (): void {
    RoutableBoards::forget();
});

it('returns the thread replies, built the way the thread page builds them', function (): void {
    $board = Board::factory()->slug('g')->create();
    $thread = Thread::factory()->for($board)->create();
    Post::factory()->for($thread)->op()->create();
    Post::factory()->for($thread)->create(['body' => 'Mainline boots.']);

    $this->getJson("/g/{$thread->no}/replies")
        ->assertOk()
        ->assertJsonPath('comments.0.body', 'Mainline boots.');
});

/** Reading needs no account here, and the drawer is a reading surface. */
it('answers a signed-out anon', function (): void {
    $board = Board::factory()->slug('g')->create();
    $thread = Thread::factory()->for($board)->create();
    Post::factory()->for($thread)->op()->create();

    $this->getJson("/g/{$thread->no}/replies")->assertOk();
});

it('404s for a thread that is not on that board', function (): void {
    $board = Board::factory()->slug('g')->create();
    Board::factory()->slug('v')->create();
    $thread = Thread::factory()->for($board)->create();
    Post::factory()->for($thread)->op()->create();

    $this->getJson("/v/{$thread->no}/replies")->assertNotFound();
});
