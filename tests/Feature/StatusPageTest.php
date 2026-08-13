<?php

declare(strict_types=1);

use App\Models\Board;
use App\Models\Post;
use App\Models\Thread;
use App\Models\User;

/**
 * The status page, and the bug that shipped with it.
 *
 * `Board::query()->max('synced_at')` returns whatever the driver hands back,
 * which is a raw string, while `RelativeTime::since()` type-hints
 * `?DateTimeInterface`. Every request that had a board to report type-errored.
 *
 * It reached production-shaped code because the tests around it had no boards,
 * so `max()` returned null and only the null branch ever ran. These fixtures
 * all create a synced board, which is the case that actually breaks.
 */
it('reports what Clover holds, with a board that has been synced', function (): void {
    $board = Board::factory()->slug('g')->create(['synced_at' => now()]);
    $thread = Thread::factory()->for($board)->create();
    Post::factory()->for($thread)->op()->create();

    $this->get('/status')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('status')
            ->where('boards', 1)
            ->where('threads', 1)
            ->where('posts', 1)
            ->whereNot('lastSyncedAt', null));
});

it('renders before anything has been synced', function (): void {
    $this->get('/status')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('lastSyncedAt', null)->where('boards', 0));
});

/** The feed rail reads the same figure, and broke in the same place. */
it('sends the rail its figures with a synced board present', function (): void {
    $board = Board::factory()->slug('g')->create(['synced_at' => now()]);
    $thread = Thread::factory()->for($board)->create();
    Post::factory()->for($thread)->op()->create();

    $this->get('/popular')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('library.boards', '1')
            ->whereNot('library.lastSyncedAt', null));
});

/**
 * Counted within the anon's own visibility. A panel telling a signed-out
 * visitor the site holds more than the feed beside it shows is a page
 * disagreeing with itself.
 */
it('counts only what this anon may see', function (): void {
    $adult = Board::factory()->slug('x')->state(['worksafe' => false])->create(['synced_at' => now()]);
    Thread::factory()->for($adult)->create();

    $this->get('/status')->assertInertia(fn ($page) => $page->where('boards', 0)->where('threads', 0));

    $user = User::factory()->create(['shows_mature_boards' => true]);

    $this->actingAs($user)
        ->get('/status')
        ->assertInertia(fn ($page) => $page->where('boards', 1)->where('threads', 1));
});

/** It was linked from the sidebar footer and resolved to a 404. */
it('is reachable from the link that pointed at nothing', function (): void {
    $this->get('/status')->assertOk();
});
