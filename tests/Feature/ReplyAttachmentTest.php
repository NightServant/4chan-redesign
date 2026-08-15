<?php

declare(strict_types=1);

use App\Models\Board;
use App\Models\Post;
use App\Models\Thread;
use App\Models\User;
use App\Support\RoutableBoards;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * An image attached to a reply written here.
 *
 * This is the only file Clover holds. Everything ingested points at 4chan's
 * CDN and is addressed by `media_tim`, 4chan's own id for it; a reply written
 * on Clover has no `tim`, because 4chan has never seen the image and has no id
 * to give it. `media_path` is what addresses those, and the two are mutually
 * exclusive by construction.
 */
beforeEach(function (): void {
    RoutableBoards::forget();
    Storage::fake('public');
});

function replyTarget(): array
{
    $board = Board::factory()->slug('g')->create(['max_comment_chars' => 2000]);
    $thread = Thread::factory()->for($board)->create();
    Post::factory()->for($thread)->op()->create();
    $user = User::factory()->create();

    return [$board, $thread, $user];
}

it('stores an attached image and hangs it off the reply', function (): void {
    [$board, $thread, $user] = replyTarget();

    $this->actingAs($user)
        ->post("/{$board->slug}/{$thread->no}/replies", [
            'body' => 'Here is the board.',
            'media' => UploadedFile::fake()->image('x230.png', 640, 480),
        ])
        ->assertSessionHasNoErrors();

    $reply = Post::query()->where('is_local', true)->latest('id')->firstOrFail();

    expect($reply->media_path)->not->toBeNull();
    expect($reply->hasMedia())->toBeTrue();
    expect($reply->hasLocalMedia())->toBeTrue();
    expect($reply->media_width)->toBe(640);
    expect($reply->media_height)->toBe(480);

    Storage::disk('public')->assertExists($reply->media_path);
});

/**
 * The name the browser sent is attacker-controlled text. It is kept because it
 * is what the interface shows and what a screen reader reads, but it never
 * decides where a file lands.
 */
it('never lets the uploaded filename decide the path', function (): void {
    [$board, $thread, $user] = replyTarget();

    $this->actingAs($user)
        ->post("/{$board->slug}/{$thread->no}/replies", [
            'body' => 'nice try',
            'media' => UploadedFile::fake()->image('../../evil.png'),
        ])
        ->assertSessionHasNoErrors();

    $reply = Post::query()->where('is_local', true)->latest('id')->firstOrFail();

    expect($reply->media_path)->toStartWith('attachments/g/');
    expect($reply->media_path)->not->toContain('..');
});

/**
 * `image` reads the bytes; `mimes` reads the extension. A `.png` that is really
 * something else has to fail, or Clover serves it back to a browser under a
 * name that browser trusts.
 */
it('rejects a file that is not an image whatever it is called', function (): void {
    [$board, $thread, $user] = replyTarget();

    $this->actingAs($user)
        ->post("/{$board->slug}/{$thread->no}/replies", [
            'body' => 'payload',
            'media' => UploadedFile::fake()->create('evil.png', 16, 'application/zip'),
        ])
        ->assertSessionHasErrors('media');

    expect(Post::query()->where('is_local', true)->count())->toBe(0);
});

it('rejects a file past the size limit', function (): void {
    [$board, $thread, $user] = replyTarget();
    $limit = (int) config('clover.attachments.max_kilobytes');

    $this->actingAs($user)
        ->post("/{$board->slug}/{$thread->no}/replies", [
            'body' => 'too big',
            'media' => UploadedFile::fake()->image('huge.png')->size($limit + 1),
        ])
        ->assertSessionHasErrors('media');

    expect(Post::query()->where('is_local', true)->count())->toBe(0);
});

/**
 * A reply that is only a picture is the most ordinary thing on an image board.
 *
 * The composer enables its Post button on an attachment alone, so a server
 * that required a body would be a button that fails for a case the interface
 * explicitly allows — which is the same defect as a button that does nothing,
 * wearing a validation error.
 */
it('accepts an image with no words', function (): void {
    [$board, $thread, $user] = replyTarget();

    $this->actingAs($user)
        ->post("/{$board->slug}/{$thread->no}/replies", [
            'media' => UploadedFile::fake()->image('quiet.png'),
        ])
        ->assertSessionHasNoErrors();

    $reply = Post::query()->where('is_local', true)->latest('id')->firstOrFail();

    expect($reply->body)->toBe('');
    expect($reply->hasLocalMedia())->toBeTrue();
});

/** Words or a picture, but not neither. */
it('rejects a reply that is neither words nor a picture', function (): void {
    [$board, $thread, $user] = replyTarget();

    $this->actingAs($user)
        ->post("/{$board->slug}/{$thread->no}/replies", ['body' => ''])
        ->assertSessionHasErrors('body');

    expect(Post::query()->where('is_local', true)->count())->toBe(0);
});

it('still accepts a reply with no attachment at all', function (): void {
    [$board, $thread, $user] = replyTarget();

    $this->actingAs($user)
        ->post("/{$board->slug}/{$thread->no}/replies", ['body' => 'just words'])
        ->assertSessionHasNoErrors();

    $reply = Post::query()->where('is_local', true)->latest('id')->firstOrFail();

    expect($reply->hasMedia())->toBeFalse();
    expect($reply->media_path)->toBeNull();
});

/**
 * The attachment has to reach the screen, not merely the disk. A file stored
 * and never rendered is the shape of bug this codebase keeps finding.
 */
it('renders the attachment in the thread', function (): void {
    [$board, $thread, $user] = replyTarget();

    $this->actingAs($user)->post("/{$board->slug}/{$thread->no}/replies", [
        'body' => 'look',
        'media' => UploadedFile::fake()->image('x230.png', 640, 480),
    ]);

    $this->actingAs($user)
        ->get("/{$board->slug}/{$thread->no}")
        ->assertInertia(fn ($page) => $page
            ->where('comments.0.media.filename', 'x230.png')
            ->where('comments.0.media.width', 640)
            ->has('comments.0.media.fullUrl'),
        );
});

/** Their own uploads, and only theirs. */
it('lists a local attachment under the account media tab', function (): void {
    [$board, $thread, $user] = replyTarget();

    $this->actingAs($user)->post("/{$board->slug}/{$thread->no}/replies", [
        'body' => 'mine',
        'media' => UploadedFile::fake()->image('x230.png', 640, 480),
    ]);

    $this->actingAs($user)
        ->get('/account')
        ->assertInertia(fn ($page) => $page->has('media', 1));
});

it('needs an account to attach anything', function (): void {
    [$board, $thread] = replyTarget();

    $this->post("/{$board->slug}/{$thread->no}/replies", [
        'body' => 'anon',
        'media' => UploadedFile::fake()->image('x230.png'),
    ])->assertRedirect(route('login'));

    expect(Post::query()->where('is_local', true)->count())->toBe(0);
});

/**
 * The Media tab has to show the picture, not a caption describing one.
 *
 * It sent an array of label strings — "x230.png · 640x480 · 12 KB" — and the
 * screen rendered each through `MediaPlaceholder`. So the tab could only ever
 * show a grey box with a filename in it, whatever an anon had uploaded, and it
 * was built that way before uploads existed at all.
 */
it('sends the attachment itself to the account media tab', function (): void {
    [$board, $thread, $user] = replyTarget();

    $this->actingAs($user)->post("/{$board->slug}/{$thread->no}/replies", [
        'body' => 'mine',
        'media' => UploadedFile::fake()->image('x230.png', 640, 480),
    ]);

    $this->actingAs($user)
        ->get('/account')
        ->assertInertia(fn ($page) => $page
            ->has('media', 1)
            ->where('media.0.filename', 'x230.png')
            ->where('media.0.width', 640)
            ->has('media.0.fullUrl'),
        );
});

/**
 * The first figure counted threads this anon had started, which is always
 * zero: Clover accepts no new threads, so nobody has started one. A figure
 * that can only ever read 0 is not a measurement.
 */
it('counts uploads rather than threads nobody can start', function (): void {
    [$board, $thread, $user] = replyTarget();

    $this->actingAs($user)->post("/{$board->slug}/{$thread->no}/replies", [
        'body' => 'one',
        'media' => UploadedFile::fake()->image('a.png'),
    ]);
    $this->actingAs($user)->post("/{$board->slug}/{$thread->no}/replies", [
        'body' => 'two with no picture',
    ]);

    $this->actingAs($user)
        ->get('/account')
        ->assertInertia(fn ($page) => $page
            ->where('stats.0.label', 'Media')
            ->where('stats.0.value', '1'),
        );
});
