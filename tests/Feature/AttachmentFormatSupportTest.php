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
 * Which image formats a reply may carry.
 *
 * `config/clover.php` listed `gif` among the accepted extensions while the
 * rationale above the list said `gif` was "deliberately not here". Both halves
 * cannot be true, and the two composers already advertise `image/gif` in their
 * `accept`, so the list is what the product does and the prose was stale. This
 * pins the answer down in something that runs.
 */
beforeEach(function (): void {
    RoutableBoards::forget();
    Storage::fake('public');
});

function formatTarget(): array
{
    $board = Board::factory()->slug('g')->create(['max_comment_chars' => 2000]);
    $thread = Thread::factory()->for($board)->create();
    Post::factory()->for($thread)->op()->create();

    return [$board, $thread, User::factory()->create()];
}

it('accepts every format the configuration lists', function (string $extension): void {
    [$board, $thread, $user] = formatTarget();

    $this->actingAs($user)
        ->post("/{$board->slug}/{$thread->no}/replies", [
            'body' => 'Look at this.',
            'media' => UploadedFile::fake()->image("x230.{$extension}", 64, 64),
        ])
        ->assertSessionHasNoErrors();
})->with(['jpg', 'jpeg', 'png', 'gif', 'webp']);

/** And the list above is the configured list, not a second copy of it. */
it('lists exactly those formats in the configuration', function (): void {
    expect(config('clover.attachments.mimes'))->toBe(['jpg', 'jpeg', 'png', 'gif', 'webp']);
});

/** Video is the format that really is not here, and the prose should say so. */
it('declines a video upload', function (): void {
    [$board, $thread, $user] = formatTarget();

    $this->actingAs($user)
        ->post("/{$board->slug}/{$thread->no}/replies", [
            'body' => 'Look at this.',
            'media' => UploadedFile::fake()->create('clip.webm', 16, 'video/webm'),
        ])
        ->assertSessionHasErrors('media');
});
