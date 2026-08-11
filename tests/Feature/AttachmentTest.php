<?php

declare(strict_types=1);

use App\Models\Board;
use App\Models\Post;
use App\Models\Thread;

/**
 * Attachment URLs, and who is allowed to see one without asking.
 *
 * The URL scheme is 4chan's and is keyed on `tim`, its own id for the file:
 *
 *   https://i.4cdn.org/{board}/{tim}{ext}     the image
 *   https://i.4cdn.org/{board}/{tim}s.jpg     the thumbnail, always JPEG
 *
 * The filename an anon uploaded plays no part in it. That is the trap worth
 * pinning: `media_filename` is a label, and building a URL from it produces a
 * plausible string that resolves to nothing.
 */
function postWithMedia(array $attributes = [], bool $worksafe = true): Post
{
    $board = Board::factory()->slug('g')->state([
        'worksafe' => $worksafe,
    ])->create();

    $thread = Thread::factory()->for($board)->create();

    /* The OP, because a thread card renders the opening post's attachment and
       a reply's would never reach it. */
    return Post::factory()->for($thread)->op()->create([
        'media_filename' => 'x230',
        'media_extension' => '.png',
        'media_tim' => 1745612650141704,
        'media_width' => 1440,
        'media_height' => 900,
        'media_thumb_width' => 250,
        'media_thumb_height' => 156,
        'media_size' => 421_888,
        ...$attributes,
    ]);
}

it('builds the image URL from the board slug and tim, not the filename', function (): void {
    $post = postWithMedia();

    expect($post->mediaUrl())
        ->toBe('https://i.4cdn.org/g/1745612650141704.png')
        ->not->toContain('x230');
});

it('builds the thumbnail URL as JPEG whatever the original was', function (): void {
    $post = postWithMedia(['media_extension' => '.webm']);

    expect($post->mediaThumbnailUrl())
        ->toBe('https://i.4cdn.org/g/1745612650141704s.jpg');
});

it('has no URLs for a post with no attachment', function (): void {
    $post = postWithMedia([
        'media_filename' => null,
        'media_tim' => null,
    ]);

    expect($post->hasMedia())->toBeFalse();
    expect($post->mediaUrl())->toBeNull();
    expect($post->mediaThumbnailUrl())->toBeNull();
});

/**
 * A row can carry a filename and no `tim` — an older sync wrote exactly that,
 * before the column existed. Treating it as an attachment would build
 * `.../0.png` and render a broken image on every pre-existing post.
 */
it('treats an attachment with no tim as no attachment', function (): void {
    $post = postWithMedia(['media_tim' => null]);

    expect($post->hasMedia())->toBeFalse();
    expect($post->mediaUrl())->toBeNull();
});

it('honours the CDN host from config', function (): void {
    config()->set('clover.cdn.images', 'https://example.test/');

    expect(postWithMedia()->mediaUrl())
        ->toBe('https://example.test/g/1745612650141704.png');
});

describe('concealment', function (): void {
    it('shows an ordinary image on a worksafe board outright', function (): void {
        expect(postWithMedia()->mediaConcealment())->toBeNull();
    });

    it('covers an attachment 4chan marked a spoiler', function (): void {
        expect(postWithMedia(['media_spoiler' => true])->mediaConcealment())
            ->toBe('spoiler');
    });

    it('covers every attachment on a board marked not worksafe', function (): void {
        expect(postWithMedia([], worksafe: false)->mediaConcealment())
            ->toBe('mature');
    });

    /**
     * A spoiler on a not-worksafe board reports the spoiler, because that is
     * the more specific reason and the one whose copy is true: the anon who
     * posted it covered it deliberately.
     */
    it('reports the spoiler when both reasons apply', function (): void {
        expect(
            postWithMedia(['media_spoiler' => true], worksafe: false)
                ->mediaConcealment(),
        )->toBe('spoiler');
    });

    it('has nothing to conceal when there is no attachment', function (): void {
        expect(
            postWithMedia(['media_filename' => null, 'media_tim' => null])
                ->mediaConcealment(),
        )->toBeNull();
    });
});

/**
 * The homepage previews real threads and withholds their images.
 *
 * The threads themselves are the point — they are what the product actually
 * contains. Their attachments are a different matter: this is the first screen
 * a visitor sees, and whatever anons uploaded in the last hour is not
 * something to put behind the product's own pitch.
 *
 * Asserted on the payload rather than on the markup, because withholding and
 * hiding are not the same thing. A URL that reaches the page can be requested
 * whatever the components do with it; the point of doing this server-side is
 * that the homepage cannot make a request to 4chan's CDN at all.
 */
it('sends the homepage no attachments', function (): void {
    postWithMedia();

    $this->get('/')->assertInertia(
        fn ($page) => $page
            ->component('welcome')
            ->has('threads', 1)
            ->where('threads.0.media', null),
    );
});

it('never puts a CDN URL on the homepage', function (): void {
    postWithMedia();

    expect($this->get('/')->getContent())->not->toContain('4cdn.org');
});

/**
 * The suppression is the homepage's alone. A board or feed listing the same
 * thread still carries its image, so this must not be a change to the resource
 * everybody shares.
 */
it('still sends attachments to the board page', function (): void {
    $post = postWithMedia();

    $this->get("/{$post->thread->board->slug}")->assertInertia(
        fn ($page) => $page
            ->component('board')
            ->where('threads.0.media.thumbnailUrl', $post->mediaThumbnailUrl()),
    );
});
