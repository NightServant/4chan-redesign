<?php

declare(strict_types=1);

use App\Models\Board;
use App\Models\Post;
use App\Models\Thread;

/**
 * How an attachment is addressed.
 *
 * Deliberately without `Storage::fake()`. The fake builds a disk with no
 * configured `url`, so `Storage::url()` returns a root-relative path whatever
 * the real configuration says — which means a faked disk cannot reproduce the
 * bug this file exists for, and a test written on top of one passes while the
 * site is broken.
 */
function localPost(): Post
{
    $board = Board::factory()->slug('g')->create();
    $thread = Thread::factory()->for($board)->create();

    return Post::factory()->for($thread)->create([
        'media_filename' => 'x230',
        'media_extension' => '.png',
        'media_tim' => null,
        'media_path' => 'attachments/g/abc123.png',
        'media_width' => 640,
        'media_height' => 480,
    ]);
}

/**
 * `Storage::url()` builds from `APP_URL`. An `APP_URL` whose scheme does not
 * match how the site is served produces an `http://` image on an `https://`
 * page, which every browser blocks as mixed content — silently. The image does
 * not appear and nothing an anon can see says why.
 *
 * The file is served by this application, so the URL has no business naming a
 * scheme or a host: root-relative inherits both from the page rendering it and
 * cannot be wrong.
 */
it('addresses a local attachment relative to the site root', function (): void {
    config(['app.url' => 'http://4chan-redesign.test']);

    expect(localPost()->mediaUrl())->toBe('/storage/attachments/g/abc123.png');
});

it('stays root-relative whatever APP_URL says', function (): void {
    config(['app.url' => 'https://example.test']);
    $post = localPost();

    expect($post->mediaUrl())->toStartWith('/storage/');
    expect($post->mediaUrl())->not->toStartWith('http');
});

it('uses the same relative form for the thumbnail', function (): void {
    expect(localPost()->mediaThumbnailUrl())->toStartWith('/storage/');
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
