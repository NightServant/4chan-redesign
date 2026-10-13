<?php

declare(strict_types=1);

use App\Models\Attachment;
use App\Models\Board;
use App\Models\Post;
use App\Models\Thread;
use App\Models\User;
use App\Support\RoutableBoards;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Inertia\Support\SessionKey;

/**
 * What deleting an account does to the images that account uploaded.
 *
 * The privacy page promises an image attached to a reply is deleted with the
 * account that posted it. `posts.user_id` is `nullOnDelete`, so the post
 * survives the account as an anonymous row -- which is deliberate -- and the
 * image, a row in `attachments`, would have stayed with it, addressable by
 * anyone holding its uuid.
 *
 * The post surviving is deliberate and stays. The image does not.
 */
beforeEach(function (): void {
    RoutableBoards::forget();
});

/**
 * @return array{0: Board, 1: Thread, 2: User}
 */
function deletionTarget(): array
{
    $board = Board::factory()->slug('g')->create(['max_comment_chars' => 2000]);
    $thread = Thread::factory()->for($board)->create();
    Post::factory()->for($thread)->op()->create();
    $user = User::factory()->create();

    return [$board, $thread, $user];
}

it('deletes the images an account uploaded and leaves the post behind without them', function (): void {
    [$board, $thread, $user] = deletionTarget();

    $this->actingAs($user)->post("/{$board->slug}/{$thread->no}/replies", [
        'body' => 'here is my desk',
        'media' => UploadedFile::fake()->image('x230.png', 640, 480),
    ])->assertSessionHasNoErrors();

    $reply = Post::query()->where('is_local', true)->latest('id')->firstOrFail();
    expect(Attachment::query()->where('uuid', $reply->media_path)->exists())->toBeTrue();

    $this->actingAs($user)
        ->delete(route('profile.destroy'), ['password' => 'password'])
        ->assertSessionHasNoErrors();

    expect(User::query()->find($user->id))->toBeNull();
    expect(Attachment::query()->count())->toBe(0);

    /* The post is a deliberate survivor: it was anonymous the whole time and
       nothing on it pointed back at the account. What it must not survive as
       is a row addressing an image that is gone. */
    $reply->refresh();

    expect($reply->exists)->toBeTrue();
    expect($reply->body)->toBe('here is my desk');
    expect($reply->user_id)->toBeNull();
    expect($reply->media_path)->toBeNull();
    expect($reply->media_filename)->toBeNull();
    expect($reply->media_extension)->toBeNull();
    expect($reply->media_width)->toBeNull();
    expect($reply->media_height)->toBeNull();
    expect($reply->media_size)->toBeNull();
    expect($reply->hasMedia())->toBeFalse();
    expect($reply->mediaUrl())->toBeNull();
});

/**
 * A post whose image has gone renders as a post without one. Clearing the row
 * and leaving the thread page asking for the missing file would be the same
 * bug wearing a broken image icon.
 */
it('still renders the orphaned post on its thread, without an image', function (): void {
    [$board, $thread, $user] = deletionTarget();

    $this->actingAs($user)->post("/{$board->slug}/{$thread->no}/replies", [
        'body' => 'here is my desk',
        'media' => UploadedFile::fake()->image('x230.png', 640, 480),
    ])->assertSessionHasNoErrors();

    $this->actingAs($user)
        ->delete(route('profile.destroy'), ['password' => 'password'])
        ->assertSessionHasNoErrors();

    $this->get("/{$board->slug}/{$thread->no}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('comments.0.body', 'here is my desk')
            ->where('comments.0.media', null),
        );
});

/**
 * Several posts, only some with attachments. A cleanup that assumed every post
 * carried an image would either skip the ones that did or fall over on the
 * ones that did not.
 */
it('clears every attachment the account made and leaves its text-only posts alone', function (): void {
    [$board, $thread, $user] = deletionTarget();

    foreach (['one.png', null, 'two.png'] as $name) {
        $this->actingAs($user)->post("/{$board->slug}/{$thread->no}/replies", array_filter([
            'body' => 'reply '.($name ?? 'without a picture'),
            'media' => $name === null ? null : UploadedFile::fake()->image($name),
        ]))->assertSessionHasNoErrors();
    }

    expect(Attachment::query()->count())->toBe(2);

    $this->actingAs($user)
        ->delete(route('profile.destroy'), ['password' => 'password'])
        ->assertSessionHasNoErrors();

    expect(Attachment::query()->count())->toBe(0);

    expect(Post::query()->where('is_local', true)->count())->toBe(3);
    expect(Post::query()->where('is_local', true)->whereNotNull('media_path')->count())->toBe(0);
    expect(Post::query()->where('is_local', true)->whereNotNull('user_id')->count())->toBe(0);
});

/**
 * However the account goes. A cleanup living in the controller would be one an
 * artisan command, a queued job or a cascading delete walked straight past.
 */
it('cleans up when the model is deleted outside the controller', function (): void {
    [$board, $thread, $user] = deletionTarget();

    $this->actingAs($user)->post("/{$board->slug}/{$thread->no}/replies", [
        'body' => 'by hand',
        'media' => UploadedFile::fake()->image('x230.png'),
    ])->assertSessionHasNoErrors();

    $reply = Post::query()->where('is_local', true)->latest('id')->firstOrFail();

    $user->delete();

    expect(Attachment::query()->count())->toBe(0);
    expect($reply->refresh()->media_path)->toBeNull();
});

/**
 * Deleting an account said nothing at all: the page changed, the account menu
 * went, and that was the entire acknowledgement of an irreversible action.
 *
 * The message names the part an anon cannot see for themselves -- that their
 * uploads went too -- and it is flashed after `invalidate()`, which empties
 * the session anything flashed before it would have been written into.
 */
it('confirms the deletion, and says what went with it', function (): void {
    $user = User::factory()->create(['password' => Hash::make('correct-horse')]);

    $this->actingAs($user)
        ->from('/settings')
        ->delete('/settings/profile', ['password' => 'correct-horse'])
        ->assertRedirect('/');

    /* Inertia 3 carries flash data on its own channel rather than as a page
       prop -- `session()->flash(SessionKey::FLASH_DATA, ...)`, which the
       client picks up through a `flash` router event -- so this asserts the
       session rather than the props. */
    expect(session(SessionKey::FLASH_DATA))->toMatchArray([
        'toast' => [
            'type' => 'success',
            'message' => 'Your account is gone, along with anything you uploaded. Posts stay, unsigned.',
        ],
    ]);
});

it('leaves another account\'s images alone', function (): void {
    [$board, $thread, $user] = deletionTarget();
    $other = User::factory()->create();

    foreach ([$user, $other] as $author) {
        $this->actingAs($author)->post("/{$board->slug}/{$thread->no}/replies", [
            'body' => 'mine',
            'media' => UploadedFile::fake()->image('x230.png'),
        ])->assertSessionHasNoErrors();
    }

    $user->delete();

    expect(Attachment::query()->count())->toBe(1);
    expect(Post::query()->where('user_id', $other->id)->whereNotNull('media_path')->count())->toBe(1);
});
