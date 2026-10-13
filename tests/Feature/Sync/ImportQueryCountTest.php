<?php

declare(strict_types=1);

use App\Models\Board;
use App\Models\Post;
use App\Models\Thread;
use App\Services\FourChan\Importer;
use App\Services\LocalPostNumbers;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Sync\Fixture;

/**
 * How many statements an import costs, which is what decides how long a sync
 * takes against a database that is a network hop away.
 *
 * The importer used to write row by row: a select and then an insert or update
 * for every thread, and the same again for every opening post. Against Neon at
 * 0.12 to 0.25 seconds a round trip, one pass over the 77 boards took hours
 * with nothing wrong with any single query. So the number of statements is a
 * property worth pinning, not an implementation detail.
 */
function queriesDuring(Closure $work): int
{
    $count = 0;

    DB::listen(function () use (&$count): void {
        $count++;
    });

    $work();

    return $count;
}

/**
 * A board-sized catalog grown from a recorded stub, for the same reason
 * `CatalogImportTest` does it: the six recorded threads are too few for a
 * per-row cost to show.
 *
 * @return array<int, array<string, mixed>>
 */
function catalogOf(int $threads): array
{
    $stub = Fixture::json('g-catalog.json')[0]['threads'][0];

    return [[
        'page' => 1,
        'threads' => array_map(
            fn (int $offset): array => [...$stub, 'no' => $stub['no'] + $offset],
            range(1, $threads),
        ),
    ]];
}

it('imports a catalog in a handful of statements, whatever its size', function (): void {
    $importer = app(Importer::class);

    $small = Board::factory()->slug('g')->create();
    $large = Board::factory()->slug('a')->create();

    $forSmall = queriesDuring(fn () => $importer->importThreads($small, catalogOf(150)));
    $forLarge = queriesDuring(fn () => $importer->importThreads($large, catalogOf(450)));

    expect($small->threads()->count())->toBe(150);
    expect($large->threads()->count())->toBe(450);

    /*
     * Count the replies posted on Clover, so the upsert's figure does not erase
     * them; upsert the threads; read their ids back; upsert the opening posts.
     */
    expect($forSmall)->toBe(4);
    expect($forLarge)->toBe($forSmall);
});

it('counts the replies posted here in one statement, however many threads have them', function (): void {
    $importer = app(Importer::class);
    $board = Board::factory()->slug('g')->create();
    $importer->importThreads($board, catalogOf(150));

    $without = queriesDuring(fn () => $importer->importThreads($board, catalogOf(150)));

    $withReplies = $board->threads()->orderBy('no')->limit(40)->get();

    foreach ($withReplies as $thread) {
        Post::factory()->for($thread)->create([
            'user_id' => null,
            'is_local' => true,
            'is_op' => false,
            'no' => LocalPostNumbers::next($board),
        ]);
    }

    $with = queriesDuring(fn () => $importer->importThreads($board, catalogOf(150)));

    $upstream = catalogOf(1)[0]['threads'][0]['replies'];

    expect($without)->toBe(4)
        ->and($with)->toBe(4)
        ->and($board->threads()->whereIn('id', $withReplies->modelKeys())->pluck('replies_count')->unique()->all())->toBe([$upstream + 1])
        ->and($board->threads()->whereNotIn('id', $withReplies->modelKeys())->pluck('replies_count')->unique()->all())->toBe([$upstream]);
});

it('imports every board in one statement, however many there are', function (): void {
    $importer = app(Importer::class);

    $recorded = Fixture::json('boards.json');

    /** Grown from the recorded rows, like the catalog above: ten boards would hide a per-board cost. */
    $everyBoard = ['boards' => array_map(
        fn (int $i): array => [...$recorded['boards'][$i % count($recorded['boards'])], 'board' => "b{$i}"],
        range(1, 77),
    )];

    expect(queriesDuring(fn () => $importer->importBoards($everyBoard)))->toBe(1)
        ->and(Board::query()->count())->toBe(77)
        ->and(queriesDuring(fn () => $importer->importBoards($everyBoard)))->toBe(1);
});

it('imports a thread page in a handful of statements', function (): void {
    $thread = Thread::factory()->create();

    $queries = queriesDuring(
        fn () => app(Importer::class)->importPosts($thread, Fixture::json('g-thread-109514275.json')),
    );

    /*
     * Upsert the posts, count the replies posted on Clover, then stamp the
     * thread as fully synced.
     */
    expect($queries)->toBe(3);
    expect($thread->posts()->count())->toBe(6);
});

it('writes a thread page\'s posts and its counts in one transaction, so a reader never pairs one with the other\'s old', function (): void {
    $thread = Thread::factory()->create();
    $outside = DB::transactionLevel();
    $levels = [];

    DB::listen(function (QueryExecuted $query) use (&$levels): void {
        if (preg_match('/^\s*(insert|update)\b/i', $query->sql) === 1) {
            $levels[] = DB::transactionLevel();
        }
    });

    app(Importer::class)->importPosts($thread, Fixture::json('g-thread-109514275.json'));

    expect($levels)->toHaveCount(2)
        ->and(min($levels))->toBeGreaterThan($outside);
});
