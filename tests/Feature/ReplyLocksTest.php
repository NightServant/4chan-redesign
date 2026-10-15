<?php

declare(strict_types=1);

use App\Models\Attachment;
use App\Models\Board;
use App\Models\Post;
use App\Models\Thread;
use App\Models\User;
use App\Services\FourChan\Importer;
use App\Support\AdvisoryLock;
use App\Support\RoutableBoards;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Sync\Fixture;

/**
 * Two anons replying at once.
 *
 * `FOR UPDATE` on the highest post does not serialise them on Postgres: the
 * second transaction cannot see the first one's uncommitted row, reads the same
 * maximum, and either fails on the unique index (same thread) or quietly takes
 * the same number (two threads of one board). The same blindness lets two
 * uploads both fit under a cap that only one of them fits under.
 *
 * Real concurrency needs two committing connections, which a test that rolls
 * everything back cannot have. What these prove is the next best thing: at the
 * moment the rows are written, another connection finds the lock taken.
 */
beforeEach(function (): void {
    RoutableBoards::forget();
});

/** Whether a second connection finds this advisory lock held. */
function lockIsHeldElsewhere(int $namespace, int $key): bool
{
    $other = DB::connectUsing('lock-probe', config('database.connections.pgsql'), true);

    return ! $other->selectOne('select pg_try_advisory_xact_lock(?::int, ?::int) as free', [$namespace, $key])->free;
}

it('numbers local replies one board at a time', function (): void {
    $board = Board::factory()->slug('g')->create();
    $thread = Thread::factory()->for($board)->create();
    Post::factory()->for($thread)->op()->create();
    $held = null;
    $freeElsewhere = null;

    Post::creating(function () use ($board, &$held, &$freeElsewhere): void {
        $held ??= lockIsHeldElsewhere(AdvisoryLock::POST_NUMBERS, $board->id);
        $freeElsewhere ??= ! lockIsHeldElsewhere(AdvisoryLock::POST_NUMBERS, $board->id + 1000);
    });

    $this->actingAs(User::factory()->create())
        ->post("/{$board->slug}/{$thread->no}/replies", ['body' => 'numbered'])
        ->assertRedirect();

    expect($held)->toBeTrue()->and($freeElsewhere)->toBeTrue();
})->skip(fn (): bool => config('database.default') !== 'pgsql', 'Advisory locks are Postgres only.');

it('stores one image at a time', function (): void {
    $board = Board::factory()->slug('g')->create();
    $thread = Thread::factory()->for($board)->create();
    Post::factory()->for($thread)->op()->create();
    $imagesHeld = null;
    $boardHeld = null;

    Attachment::creating(function () use ($board, &$imagesHeld, &$boardHeld): void {
        $imagesHeld = lockIsHeldElsewhere(AdvisoryLock::IMAGES, 0);
        $boardHeld = lockIsHeldElsewhere(AdvisoryLock::POST_NUMBERS, $board->id);
    });

    $this->actingAs(User::factory()->create())
        ->post("/{$board->slug}/{$thread->no}/replies", [
            'body' => 'with a picture',
            'media' => UploadedFile::fake()->image('x230.png', 16, 16),
        ])
        ->assertRedirect();

    expect($imagesHeld)->toBeTrue()->and($boardHeld)->toBeTrue();
})->skip(fn (): bool => config('database.default') !== 'pgsql', 'Advisory locks are Postgres only.');

it('does not take the images lock for a reply with no image', function (): void {
    $board = Board::factory()->slug('g')->create();
    $thread = Thread::factory()->for($board)->create();
    Post::factory()->for($thread)->op()->create();
    $imagesHeld = null;

    Post::creating(function () use (&$imagesHeld): void {
        $imagesHeld = lockIsHeldElsewhere(AdvisoryLock::IMAGES, 0);
    });

    $this->actingAs(User::factory()->create())
        ->post("/{$board->slug}/{$thread->no}/replies", ['body' => 'words only'])
        ->assertRedirect();

    expect($imagesHeld)->toBeFalse();
})->skip(fn (): bool => config('database.default') !== 'pgsql', 'Advisory locks are Postgres only.');

it('gives replies in different threads of one board different numbers', function (): void {
    $board = Board::factory()->slug('g')->create();
    $user = User::factory()->create();

    foreach ([1, 2, 3] as $ignored) {
        $thread = Thread::factory()->for($board)->create();
        Post::factory()->for($thread)->op()->create();

        $this->actingAs($user)
            ->post("/{$board->slug}/{$thread->no}/replies", ['body' => 'hello'])
            ->assertRedirect();
    }

    $numbers = Post::query()->where('is_local', true)->pluck('no')->all();

    expect($numbers)->toHaveCount(3)->and(array_unique($numbers))->toHaveCount(3);
});

/**
 * An import writes absolute counts: upstream's plus the replies posted here,
 * read just before. A reply committing between that read and the write was
 * lost until the next import, so both now run under the board's lock, the
 * one a reply holds from its number to its increment.
 */
it('imports a catalog under the lock a reply on that board holds', function (): void {
    $board = Board::factory()->slug('g')->create();
    $held = null;

    DB::listen(function (QueryExecuted $query) use ($board, &$held): void {
        if ($held === null && str_starts_with($query->sql, 'insert into "threads"')) {
            $held = lockIsHeldElsewhere(AdvisoryLock::POST_NUMBERS, $board->id);
        }
    });

    app(Importer::class)->importThreads($board, Fixture::json('g-catalog.json'));

    expect($held)->toBeTrue();
})->skip(fn (): bool => config('database.default') !== 'pgsql', 'Advisory locks are Postgres only.');

it('stamps a thread\'s counts under the same lock', function (): void {
    $board = Board::factory()->slug('g')->create();
    $payload = Fixture::json('g-thread-109514275.json');
    $thread = Thread::factory()->for($board)->create(['no' => $payload['posts'][0]['no']]);
    $held = null;

    Thread::updating(function () use ($board, &$held): void {
        $held ??= lockIsHeldElsewhere(AdvisoryLock::POST_NUMBERS, $board->id);
    });

    app(Importer::class)->importPosts($thread, $payload);

    expect($held)->toBeTrue();
})->skip(fn (): bool => config('database.default') !== 'pgsql', 'Advisory locks are Postgres only.');
