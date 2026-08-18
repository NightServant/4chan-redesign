<?php

declare(strict_types=1);

use App\Models\Board;
use App\Models\Post;
use App\Models\Thread;
use App\Support\RoutableBoards;
use Inertia\Testing\AssertableInertia;

/**
 * What the footer's image count counts.
 *
 * `images_count` is 4chan's own `images` field, which counts the images on
 * *replies* and excludes the opening post's. A thread whose only picture is
 * the OP's therefore reported "0 images" directly beneath that picture, which
 * is a number a reader can see is wrong.
 */
beforeEach(function (): void {
    RoutableBoards::forget();
});

it('counts the opening post`s own file', function (): void {
    $board = Board::factory()->slug('g')->create();
    $thread = Thread::factory()->for($board)->create(['images_count' => 0]);
    /* `hasMedia` needs the filename as well as the id: a post carrying one
       without the other is a half-synced row, not an attachment. */
    Post::factory()->for($thread)->op()->create([
        'media_tim' => 1750642808177390,
        'media_filename' => 'JitaWiP',
        'media_extension' => '.png',
    ]);

    $this->get("/g/{$thread->no}")
        ->assertOk()
        ->assertInertia(
            fn (AssertableInertia $page) => $page->where('thread.images', '1')
        );
});

it('adds it to the replies` own images rather than replacing them', function (): void {
    $board = Board::factory()->slug('g')->create();
    $thread = Thread::factory()->for($board)->create(['images_count' => 4]);
    Post::factory()->for($thread)->op()->create([
        'media_tim' => 1750642808177391,
        'media_filename' => 'JitaWiP',
        'media_extension' => '.png',
    ]);

    $this->get("/g/{$thread->no}")
        ->assertOk()
        ->assertInertia(
            fn (AssertableInertia $page) => $page->where('thread.images', '5')
        );
});

/** A text-only OP contributes nothing, and the reply count stands alone. */
it('leaves a thread whose opening post carries no file', function (): void {
    $board = Board::factory()->slug('g')->create();
    $thread = Thread::factory()->for($board)->create(['images_count' => 3]);
    Post::factory()->for($thread)->op()->create([
        'media_tim' => null,
        'media_path' => null,
        'media_filename' => null,
    ]);

    $this->get("/g/{$thread->no}")
        ->assertOk()
        ->assertInertia(
            fn (AssertableInertia $page) => $page->where('thread.images', '3')
        );
});
