<?php

declare(strict_types=1);

use App\Models\Board;
use App\Models\Post;
use App\Models\Thread;

/**
 * How an attachment is addressed.
 *
 * A local upload is a row in `attachments`, found by its uuid, and served by
 * this application: so the URL names no scheme and no host. `APP_URL` can
 * disagree with how the site is actually served (an `http://` image on an
 * `https://` page is blocked as mixed content, silently), and a root-relative
 * URL inherits both from the page rendering it and cannot be wrong.
 *
 * Which of two routes it names depends on the board. A worksafe board's images
 * are the same for every viewer and may sit in a shared cache; a mature
 * board's depend on who is asking and may not.
 */
function localPost(bool $worksafe = true): Post
{
    $board = Board::factory()->slug('g')->state(['worksafe' => $worksafe])->create();
    $thread = Thread::factory()->for($board)->create();

    return Post::factory()->for($thread)->create([
        'media_filename' => 'x230',
        'media_extension' => '.png',
        'media_tim' => null,
        'media_path' => 'c1f4ae38-6a43-4b0d-9e0a-5f7a2f6b9a11',
        'media_width' => 640,
        'media_height' => 480,
    ]);
}

it('addresses a local attachment by uuid, relative to the site root', function (): void {
    config(['app.url' => 'http://4chan-redesign.test']);

    expect(localPost()->mediaUrl())->toBe('/attachments/c1f4ae38-6a43-4b0d-9e0a-5f7a2f6b9a11');
});

it('stays root-relative whatever APP_URL says', function (): void {
    config(['app.url' => 'https://example.test']);

    $url = localPost()->mediaUrl();

    expect($url)->toStartWith('/attachments/')->and($url)->not->toStartWith('http');
});

it('sends an image from a mature board to the route that checks who is asking', function (): void {
    expect(localPost(worksafe: false)->mediaUrl())
        ->toBe('/attachments/c1f4ae38-6a43-4b0d-9e0a-5f7a2f6b9a11/mature');
});

it('uses the same relative form for the thumbnail', function (): void {
    $post = localPost();

    expect($post->mediaThumbnailUrl())->toBe($post->mediaUrl());
});

/** Ingested attachments live on 4chan's CDN and keep their absolute URL. */
it('leaves an ingested attachment pointing at 4chan', function (): void {
    $board = Board::factory()->slug('g')->create();
    $thread = Thread::factory()->for($board)->create();
    $post = Post::factory()->for($thread)->create([
        'media_filename' => '1712345678901',
        'media_extension' => '.jpg',
        'media_tim' => 1712345678901,
        'media_path' => null,
    ]);

    expect($post->mediaUrl())->toStartWith('https://i.4cdn.org/');
});
