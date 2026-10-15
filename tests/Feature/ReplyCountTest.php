<?php

declare(strict_types=1);

use App\Models\Board;
use App\Models\Post;
use App\Models\Thread;
use App\Models\User;
use App\Services\FourChan\Importer;
use App\Support\RoutableBoards;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Sync\Fixture;

/**
 * The reply count a local reply leaves behind.
 *
 * `ReplyController` used to write `replies_count + 1` from the thread it had
 * loaded before it did anything else, so an import landing in between was
 * overwritten with a stale number. It adds one in the database now.
 */
beforeEach(function (): void {
    RoutableBoards::forget();
});

it('adds one to the count the database holds, not to the one it loaded', function (): void {
    $board = Board::factory()->slug('g')->create();
    $thread = Thread::factory()->for($board)->create(['replies_count' => 5]);
    Post::factory()->for($thread)->op()->create();

    /* An import lands after the controller read the thread and before it wrote. */
    Post::creating(function (Post $post) use ($thread): void {
        DB::table('threads')->where('id', $thread->id)->update(['replies_count' => 50]);
    });

    $this->actingAs(User::factory()->create())
        ->post("/{$board->slug}/{$thread->no}/replies", ['body' => 'in between'])
        ->assertRedirect();

    expect($thread->fresh()->replies_count)->toBe(51);
});

it('still bumps the thread', function (): void {
    $this->freezeTime();
    $board = Board::factory()->slug('g')->create();
    $thread = Thread::factory()->for($board)->create(['bumped_at' => now()->subDay()]);
    Post::factory()->for($thread)->op()->create();

    $this->actingAs(User::factory()->create())
        ->post("/{$board->slug}/{$thread->no}/replies", ['body' => 'bump'])
        ->assertRedirect();

    expect($thread->fresh()->bumped_at->toDateTimeString())->toBe(now()->toDateTimeString());
});

/**
 * Imports are absolute -- upstream's count plus the replies written here -- so
 * the increment and the import must agree on what is already in the total.
 */
it('composes with an import without counting a local reply twice', function (): void {
    $board = Board::factory()->slug('g')->create();
    $payload = Fixture::json('g-thread-109514275.json');
    $upstream = (int) $payload['posts'][0]['replies'];
    $thread = Thread::factory()->for($board)->create(['no' => $payload['posts'][0]['no'], 'replies_count' => $upstream]);
    Post::factory()->for($thread)->op()->create();
    $user = User::factory()->create();

    $reply = fn () => $this->actingAs($user)
        ->post("/{$board->slug}/{$thread->no}/replies", ['body' => 'local'])
        ->assertRedirect();
    $import = fn () => app(Importer::class)->importPosts($thread->fresh(), $payload);

    $reply();
    $reply();
    expect($thread->fresh()->replies_count)->toBe($upstream + 2);

    $import();
    expect($thread->fresh()->replies_count)->toBe($upstream + 2);

    $import();
    expect($thread->fresh()->replies_count)->toBe($upstream + 2);

    $reply();
    expect($thread->fresh()->replies_count)->toBe($upstream + 3);

    $import();
    expect($thread->fresh()->replies_count)->toBe($upstream + 3);
});

/**
 * A reply posted here bumps its thread, and a catalog that has not heard of
 * it must not put the thread back where it was. The import keeps whichever
 * is later: upstream's bump or the newest reply posted on Clover.
 */
it('keeps the bump a local reply gave its thread through a catalog import', function (): void {
    $board = Board::factory()->slug('g')->create();
    $stub = Fixture::json('g-catalog.json')[0]['threads'][0];
    $thread = Thread::factory()->for($board)->create(['no' => $stub['no']]);
    Post::factory()->for($thread)->op()->create(['no' => $stub['no']]);
    $this->freezeTime();

    $this->actingAs(User::factory()->create())
        ->post("/{$board->slug}/{$thread->no}/replies", ['body' => 'bump'])
        ->assertRedirect();

    app(Importer::class)->importThreads($board, [['page' => 1, 'threads' => [$stub]]]);

    $thread->refresh();
    expect($thread->bumped_at->toDateTimeString())->toBe(now()->toDateTimeString());
    expect($thread->replies_count)->toBe((int) $stub['replies'] + 1);
});

it('still takes upstream\'s bump when it is the later one', function (): void {
    $board = Board::factory()->slug('g')->create();
    $stub = Fixture::json('g-catalog.json')[0]['threads'][0];
    $upstream = (int) ($stub['last_modified'] ?? $stub['time']);
    $thread = Thread::factory()->for($board)->create(['no' => $stub['no']]);
    Post::factory()->for($thread)->op()->create(['no' => $stub['no']]);

    $this->travelTo(now()->setTimestamp($upstream)->subHour());
    $this->actingAs(User::factory()->create())
        ->post("/{$board->slug}/{$thread->no}/replies", ['body' => 'earlier'])
        ->assertRedirect();
    $this->travelBack();

    app(Importer::class)->importThreads($board, [['page' => 1, 'threads' => [$stub]]]);

    expect($thread->fresh()->bumped_at->getTimestamp())->toBe($upstream);
});
