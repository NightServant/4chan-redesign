<?php

declare(strict_types=1);

use App\Models\Attachment;
use App\Models\Board;
use App\Models\Post;
use App\Models\Thread;
use App\Models\User;
use App\Support\RoutableBoards;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Validator;

/**
 * An image attached to a reply written here.
 *
 * This is the only file Clover holds. Everything ingested points at 4chan's
 * CDN and is addressed by `media_tim`, 4chan's own id for it; a reply written
 * on Clover has no `tim`, because 4chan has never seen the image and has no id
 * to give it. `media_path` is what addresses those -- the uuid of an
 * `attachments` row, which holds the bytes -- and the two are mutually
 * exclusive by construction.
 */
beforeEach(function (): void {
    RoutableBoards::forget();
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
    $file = UploadedFile::fake()->image('x230.png', 640, 480);

    $this->actingAs($user)
        ->post("/{$board->slug}/{$thread->no}/replies", [
            'body' => 'Here is the board.',
            'media' => $file,
        ])
        ->assertSessionHasNoErrors();

    $reply = Post::query()->where('is_local', true)->latest('id')->firstOrFail();

    $attachment = Attachment::query()->where('post_id', $reply->id)->firstOrFail();

    expect($reply->media_path)->toBe($attachment->uuid);
    expect($reply->hasMedia())->toBeTrue();
    expect($reply->hasLocalMedia())->toBeTrue();
    expect($reply->media_width)->toBe(640);
    expect($reply->media_height)->toBe(480);
    expect($reply->mediaUrl())->toBe("/attachments/{$attachment->uuid}");

    expect($attachment->mime)->toBe('image/png');
    expect($attachment->width)->toBe(640);
    expect($attachment->height)->toBe(480);
    expect($attachment->size)->toBe($reply->media_size);
    $stored = $attachment->contents();

    expect($attachment->size)->toBe(strlen($stored));
    expect(getimagesizefromstring($stored)[0])->toBe(640);
});

/**
 * A phone photo carries where it was taken. The product's claim is that a post
 * carries nothing pointing back at its author, so what is stored is the image
 * with that taken out -- and the size on the row is the size of what is stored,
 * not of what was uploaded.
 */
it('stores the image without the metadata or the file glued on after it', function (): void {
    [$board, $thread, $user] = replyTarget();

    $image = imagecreatetruecolor(64, 48);
    ob_start();
    imagejpeg($image);
    $plain = (string) ob_get_clean();
    $upload = tempnam(sys_get_temp_dir(), 'jpg');
    file_put_contents($upload, "\xFF\xD8\xFF\xFE\x00\x0CSECRET-GPS".substr($plain, 2).'PK-hidden-archive');

    $this->actingAs($user)
        ->post("/{$board->slug}/{$thread->no}/replies", [
            'body' => 'from my phone',
            'media' => new UploadedFile($upload, 'IMG_0001.jpg', 'image/jpeg', null, true),
        ])
        ->assertSessionHasNoErrors();

    $reply = Post::query()->where('is_local', true)->latest('id')->firstOrFail();
    $attachment = Attachment::query()->where('post_id', $reply->id)->firstOrFail();
    $stored = $attachment->contents();

    expect($stored)->not->toContain('SECRET-GPS')
        ->and($stored)->not->toContain('hidden-archive')
        ->and($attachment->mime)->toBe('image/jpeg')
        ->and($attachment->size)->toBe(strlen($stored))
        ->and($reply->media_size)->toBe(strlen($stored))
        ->and([$reply->media_width, $reply->media_height])->toBe([64, 48]);
});

it('refuses an image whose container cannot be read to the end', function (): void {
    [$board, $thread, $user] = replyTarget();

    $image = imagecreatetruecolor(8, 8);
    ob_start();
    imagepng($image);
    $png = (string) ob_get_clean();
    $upload = tempnam(sys_get_temp_dir(), 'png');
    file_put_contents($upload, substr($png, 0, -12));

    $this->actingAs($user)
        ->post("/{$board->slug}/{$thread->no}/replies", [
            'body' => 'cut short',
            'media' => new UploadedFile($upload, 'cut.png', 'image/png', null, true),
        ])
        ->assertSessionHasErrors('media');

    expect(Attachment::query()->count())->toBe(0);
    expect(Post::query()->where('is_local', true)->count())->toBe(0);
});

/**
 * The name the browser sent is attacker-controlled text. It is kept because it
 * is what the interface shows and what a screen reader reads, but it addresses
 * nothing: the image is found by a generated uuid.
 */
it('never lets the uploaded filename address anything', function (): void {
    [$board, $thread, $user] = replyTarget();

    $this->actingAs($user)
        ->post("/{$board->slug}/{$thread->no}/replies", [
            'body' => 'nice try',
            'media' => UploadedFile::fake()->image('../../evil.png'),
        ])
        ->assertSessionHasNoErrors();

    $reply = Post::query()->where('is_local', true)->latest('id')->firstOrFail();

    expect($reply->media_path)->toMatch('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/');
    expect($reply->media_filename)->toBe('evil');
});

/**
 * The type is what the bytes say. A GIF called `.png` is stored as a GIF, and a
 * client that claims `text/html` for a PNG does not get that stored either.
 */
it('takes the mime from the bytes, not from the name or the client header', function (): void {
    [$board, $thread, $user] = replyTarget();

    $gif = tempnam(sys_get_temp_dir(), 'gif');
    $image = imagecreatetruecolor(4, 4);
    imagegif($image, $gif);

    $this->actingAs($user)
        ->post("/{$board->slug}/{$thread->no}/replies", [
            'body' => 'gif in disguise',
            'media' => new UploadedFile($gif, 'looks-like.png', 'text/html', null, true),
        ])
        ->assertSessionHasNoErrors();

    expect(Attachment::query()->firstOrFail()->mime)->toBe('image/gif');
});

/**
 * The extension shown with an image is the one its bytes are, like its mime.
 * Taken from the name, a GIF called `looks-like.png` was labelled `.png`.
 */
it('labels the image with the extension its bytes have, not the one it was given', function (): void {
    [$board, $thread, $user] = replyTarget();

    $gif = tempnam(sys_get_temp_dir(), 'gif');
    imagegif(imagecreatetruecolor(4, 4), $gif);

    $this->actingAs($user)
        ->post("/{$board->slug}/{$thread->no}/replies", [
            'body' => 'gif in disguise',
            'media' => new UploadedFile($gif, 'looks-like.png', 'image/png', null, true),
        ])
        ->assertSessionHasNoErrors();

    expect(Post::query()->where('is_local', true)->latest('id')->firstOrFail()->media_extension)
        ->toBe('.gif');
});

/**
 * A file named only for its extension has no name left once the extension is
 * taken off. It was stored, counted against both limits, and never shown: a
 * post with a blank filename is a post with no image.
 */
it('names an upload called only ".png" rather than storing it unseen', function (): void {
    [$board, $thread, $user] = replyTarget();

    $this->actingAs($user)
        ->post("/{$board->slug}/{$thread->no}/replies", [
            'body' => 'nameless',
            'media' => UploadedFile::fake()->image('.png', 64, 64),
        ])
        ->assertSessionHasNoErrors();

    $reply = Post::query()->where('is_local', true)->latest('id')->firstOrFail();

    expect($reply->media_filename)->toBe('image');
    expect($reply->media_extension)->toBe('.png');
    expect($reply->hasMedia())->toBeTrue();
});

/**
 * The code once said the `image` rule had consumed the temp file, so it read
 * the dimensions back from the stored copy instead. It does not: validation
 * leaves the upload where it was, and this is the proof.
 */
it('can still read the upload after the image rule has passed it', function (): void {
    $file = UploadedFile::fake()->image('x230.png', 640, 480);

    $passes = Validator::make(['media' => $file], ['media' => ['file', 'image', 'mimes:png']])->passes();

    expect($passes)->toBeTrue()
        ->and(getimagesize((string) $file->getRealPath()))->toBeArray()
        ->and(getimagesize((string) $file->getRealPath())[0])->toBe(640);
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

/**
 * Off on a deployment with nowhere durable to keep an upload (see
 * `config('clover.attachments.enabled')`). A reply that is only words still
 * has to work: this is a upload switch, not a maintenance mode.
 */
it('rejects an attachment when attachments are disabled, but still accepts words', function (): void {
    config(['clover.attachments.enabled' => false]);
    [$board, $thread, $user] = replyTarget();

    $this->actingAs($user)
        ->post("/{$board->slug}/{$thread->no}/replies", [
            'body' => 'no pictures here',
            'media' => UploadedFile::fake()->image('x230.png'),
        ])
        ->assertSessionHasErrors('media');

    expect(Post::query()->where('is_local', true)->count())->toBe(0);

    $this->actingAs($user)
        ->post("/{$board->slug}/{$thread->no}/replies", [
            'body' => 'just words, still works',
        ])
        ->assertSessionHasNoErrors();

    expect(Post::query()->where('is_local', true)->count())->toBe(1);
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

/**
 * Neon's free tier is 0.5GB and the mirror shares it, so the images get a fixed
 * share. The cap is on everything stored so far plus this upload, and an upload
 * that lands exactly on it is the last one let through.
 */
it('takes an image that brings the total exactly to the cap', function (): void {
    [$board, $thread, $user] = replyTarget();
    $file = UploadedFile::fake()->image('x230.png', 32, 32);
    $limit = 4;
    config(['clover.attachments.max_total_kilobytes' => $limit]);
    Attachment::factory()->create(['size' => $limit * 1024 - $file->getSize()]);

    $this->actingAs($user)
        ->post("/{$board->slug}/{$thread->no}/replies", ['body' => 'last one', 'media' => $file])
        ->assertSessionHasNoErrors();

    expect(Attachment::query()->count())->toBe(2);
});

it('refuses an image that would pass the total cap, and says why', function (): void {
    [$board, $thread, $user] = replyTarget();
    $file = UploadedFile::fake()->image('x230.png', 32, 32);
    $limit = 4;
    config(['clover.attachments.max_total_kilobytes' => $limit]);
    Attachment::factory()->create(['size' => $limit * 1024 - $file->getSize() + 1]);

    $this->actingAs($user)
        ->post("/{$board->slug}/{$thread->no}/replies", ['body' => 'one too many', 'media' => $file])
        ->assertSessionHasErrors(['media' => 'Clover is not taking new images right now: the space set aside for them is full. Post the reply as text instead.']);

    expect(Attachment::query()->count())->toBe(1);
    expect(Post::query()->where('is_local', true)->count())->toBe(0);
});

it('still takes a reply that is only words once the images are full', function (): void {
    [$board, $thread, $user] = replyTarget();
    config(['clover.attachments.max_total_kilobytes' => 1]);
    Attachment::factory()->create(['size' => 5000]);

    $this->actingAs($user)
        ->post("/{$board->slug}/{$thread->no}/replies", ['body' => 'words are free'])
        ->assertSessionHasNoErrors();

    expect(Post::query()->where('is_local', true)->count())->toBe(1);
});

/** The database does this, so no code path that deletes a post can forget it. */
it('deletes the image with its post', function (): void {
    [$board, $thread, $user] = replyTarget();

    $this->actingAs($user)->post("/{$board->slug}/{$thread->no}/replies", [
        'body' => 'short lived',
        'media' => UploadedFile::fake()->image('x230.png'),
    ])->assertSessionHasNoErrors();

    expect(Attachment::query()->count())->toBe(1);

    Post::query()->where('is_local', true)->delete();

    expect(Attachment::query()->count())->toBe(0);
});

/**
 * The check in validation runs before any lock, so another upload can land
 * after it. The same check runs again with the images lock held, when the
 * image is about to be stored, and it is the one that holds.
 */
it('checks the total again once the image is being stored', function (): void {
    [$board, $thread, $user] = replyTarget();
    config(['clover.attachments.max_total_kilobytes' => 4]);

    $landed = false;
    Post::creating(function () use (&$landed): void {
        if (! $landed) {
            $landed = true;
            Attachment::factory()->create(['size' => 4096]);
        }
    });

    $this->actingAs($user)
        ->post("/{$board->slug}/{$thread->no}/replies", [
            'body' => 'second in line',
            'media' => UploadedFile::fake()->image('x230.png', 32, 32),
        ])
        ->assertSessionHasErrors(['media' => 'Clover is not taking new images right now: the space set aside for them is full. Post the reply as text instead.']);

    /* Everything rolled back, including the upload that "landed" first: both
       lived in the one test transaction. What matters is that this reply and
       its image are not there. */
    expect(Attachment::query()->count())->toBe(0);
    expect(Post::query()->where('is_local', true)->count())->toBe(0);
});

it('refuses an image once the account has used its share, and says so', function (): void {
    [$board, $thread, $user] = replyTarget();
    config(['clover.attachments.max_account_kilobytes' => 1024]);
    Attachment::factory()->for(Post::factory()->for($thread)->create(['user_id' => $user->id]))->create(['size' => 1024 * 1024]);

    $this->actingAs($user)
        ->post("/{$board->slug}/{$thread->no}/replies", [
            'body' => 'one more',
            'media' => UploadedFile::fake()->image('x230.png', 32, 32),
        ])
        ->assertSessionHasErrors(['media' => 'You have used the 1 MB of image space each account gets. Post the reply as text instead.']);

    expect(Attachment::query()->count())->toBe(1);
});

it('does not charge one account for another account\'s images', function (): void {
    [$board, $thread, $user] = replyTarget();
    config(['clover.attachments.max_account_kilobytes' => 1024]);
    $other = User::factory()->create();
    Attachment::factory()->for(Post::factory()->for($thread)->create(['user_id' => $other->id]))->create(['size' => 1024 * 1024]);

    $this->actingAs($user)
        ->post("/{$board->slug}/{$thread->no}/replies", [
            'body' => 'my own share',
            'media' => UploadedFile::fake()->image('x230.png', 32, 32),
        ])
        ->assertSessionHasNoErrors();

    expect(Attachment::query()->count())->toBe(2);
});

it('checks the account share again once the image is being stored', function (): void {
    [$board, $thread, $user] = replyTarget();
    config(['clover.attachments.max_account_kilobytes' => 1]);

    $landed = false;
    Post::creating(function () use (&$landed, $thread, $user): void {
        if (! $landed) {
            $landed = true;
            Attachment::factory()->for(Post::factory()->for($thread)->create(['user_id' => $user->id]))->create(['size' => 1024]);
        }
    });

    $this->actingAs($user)
        ->post("/{$board->slug}/{$thread->no}/replies", [
            'body' => 'two tabs at once',
            'media' => UploadedFile::fake()->image('x230.png', 8, 8),
        ])
        ->assertSessionHasErrors('media');

    expect(Attachment::query()->count())->toBe(0);
    expect(Post::query()->where('is_local', true)->where('body', 'two tabs at once')->exists())->toBeFalse();
});

/**
 * A few hundred bytes can declare a canvas every viewer's browser would try to
 * allocate, and a width past 2^31 does not fit the `integer` column the size is
 * stored in -- which used to be a 500 after the reply was half written.
 */
it('refuses a picture whose declared size is absurd, with a message and not an error', function (int $width, int $height): void {
    [$board, $thread, $user] = replyTarget();

    $image = imagecreatetruecolor(8, 8);
    ob_start();
    imagepng($image);
    $png = (string) ob_get_clean();
    $upload = tempnam(sys_get_temp_dir(), 'png');
    file_put_contents($upload, substr($png, 0, 16).pack('NN', $width, $height).substr($png, 24));

    $this->actingAs($user)
        ->post("/{$board->slug}/{$thread->no}/replies", [
            'body' => 'enormous',
            'media' => new UploadedFile($upload, 'big.png', 'image/png', null, true),
        ])
        ->assertRedirect()
        ->assertSessionHasErrors(['media' => 'That file is not an image Clover accepts.']);

    expect(Attachment::query()->count())->toBe(0);
    expect(Post::query()->where('is_local', true)->count())->toBe(0);
})->with([
    '2^32 - 1 wide' => [0xFFFFFFFF, 1],
    '30000 x 30000' => [30000, 30000],
    'zero wide' => [0, 16],
    'zero high' => [16, 0],
]);
