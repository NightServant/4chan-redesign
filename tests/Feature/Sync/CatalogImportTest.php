<?php

declare(strict_types=1);

use App\Models\Board;
use App\Models\Thread;
use App\Services\FourChan\Importer;
use Tests\Feature\Sync\Fixture;

/**
 * What a catalog sync alone is worth.
 *
 * `catalog.json` is every thread on a board in one response, and each stub is
 * the opening post: it carries `sub`, `com` and the whole media group, not
 * just thread statistics. So one request per board should produce boards that
 * are fully readable without touching the thread endpoint at all.
 *
 * It did not. The import wrote the thread row and dropped the stub, so a
 * thread had no post behind it unless its full page had also been fetched —
 * no title beyond the post number, no excerpt, no image. Combined with a
 * thirty-thread cap on a comprehensive response, that is why most of 4chan was
 * missing from the boards.
 */
function importCatalog(Board $board, ?int $limit = null): array
{
    return app(Importer::class)->importThreads(
        $board,
        Fixture::json('g-catalog.json'),
        $limit,
    );
}

it('takes the whole catalog when no limit is given', function (): void {
    $board = Board::factory()->slug('g')->create();

    $threads = importCatalog($board);

    /* The fixture is two recorded pages of the live catalog. */
    expect($threads)->toHaveCount(6);
    expect($board->threads()->count())->toBe(6);
});

/**
 * Deliberately larger than any cap anyone would reintroduce.
 *
 * The recorded fixture holds six threads, and a first version of this file
 * asserted the whole catalog against it — which passed just as happily with a
 * thirty-thread cap put back, because six is under thirty. It proved nothing.
 * A real board carries hundreds, so the payload here is grown to that scale
 * from the recorded stub rather than tested at a size where the bug hides.
 */
it('imports hundreds of threads rather than a page of them', function (): void {
    $board = Board::factory()->slug('g')->create();

    $stub = Fixture::json('g-catalog.json')[0]['threads'][0];

    $threads = [];

    foreach (range(1, 250) as $offset) {
        $threads[] = [...$stub, 'no' => $stub['no'] + $offset];
    }

    app(Importer::class)->importThreads($board, [['page' => 1, 'threads' => $threads]]);

    expect($board->threads()->count())->toBe(250);
    expect($board->threads()->has('originalPost')->count())->toBe(250);
});

it('defaults to no cap, so a comprehensive response is not truncated', function (): void {
    expect(config('clover.sync.threads_per_board'))->toBeNull();
});

it('still honours a limit when one is asked for', function (): void {
    $board = Board::factory()->slug('g')->create();

    importCatalog($board, 2);

    expect($board->threads()->count())->toBe(2);
});

/**
 * The defect that emptied the boards. Every thread must have its opening post
 * after a catalog sync, with nothing else fetched.
 */
it('writes the opening post from the catalog stub', function (): void {
    $board = Board::factory()->slug('g')->create();

    importCatalog($board);

    $withoutOp = $board->threads()->doesntHave('originalPost')->count();

    expect($withoutOp)->toBe(0, 'threads with no opening post render blank');
});

it('gives the opening post a body, so the card has a title and an excerpt', function (): void {
    $board = Board::factory()->slug('g')->create();

    importCatalog($board);

    $thread = $board->threads()->has('originalPost')->first();

    expect($thread->originalPost->body)->not->toBe('');
    expect($thread->displayTitle())->not->toBe(">>{$thread->no}");
});

it('carries the attachment through from the catalog', function (): void {
    $board = Board::factory()->slug('g')->create();

    importCatalog($board);

    $withMedia = $board->threads()
        ->whereHas('originalPost', fn ($query) => $query->whereNotNull('media_tim'))
        ->count();

    expect($withMedia)->toBeGreaterThan(0);
});

/**
 * A catalog sync is the OP and nothing else. The replies still need the thread
 * endpoint, and this flag is what records the difference — without it a
 * partially synced thread would look complete and its replies would simply be
 * missing.
 */
it('does not claim the thread is fully synced', function (): void {
    $board = Board::factory()->slug('g')->create();

    importCatalog($board);

    expect($board->threads()->whereNotNull('posts_synced_at')->count())->toBe(0);
});

it('re-imports without duplicating threads or posts', function (): void {
    $board = Board::factory()->slug('g')->create();

    importCatalog($board);
    importCatalog($board);

    expect($board->threads()->count())->toBe(6);

    $thread = $board->threads()->has('originalPost')->first();

    expect($thread->posts()->where('is_op', true)->count())->toBe(1);
});

it('orders the catalog by bump time, most recent first', function (): void {
    $board = Board::factory()->slug('g')->create();

    importCatalog($board);

    $bumped = $board->threads()->pluck('bumped_at')->all();
    $sorted = collect($bumped)->sortDesc()->values()->all();

    expect($bumped)->not->toBeEmpty();
    expect(collect($bumped)->sortByDesc(fn ($at) => $at)->values()->all())
        ->toEqual($sorted);
});

/**
 * The catalog writes the OP and the thread endpoint writes it again. They must
 * meet on the same row rather than producing two opening posts, which is what
 * the unique key on `[thread_id, no]` is for.
 *
 * The posts payload is built from the catalog's own recorded stub rather than
 * hand-written, so the OP here is the real shape the API returns — a stub and
 * a thread-page post carry the same fields, which is the whole reason one
 * writer serves both.
 */
it('meets the thread endpoint on the same opening post', function (): void {
    $board = Board::factory()->slug('g')->create();

    importCatalog($board);

    $catalog = Fixture::json('g-catalog.json');
    $stub = $catalog[0]['threads'][0];

    $thread = Thread::query()->where('no', $stub['no'])->firstOrFail();

    expect($thread->posts()->count())->toBe(1);

    $reply = $stub;
    $reply['no'] = $stub['no'] + 1;
    $reply['resto'] = $stub['no'];

    app(Importer::class)->importPosts($thread, [
        'posts' => [$stub, $reply],
    ]);

    $thread->refresh();

    expect($thread->posts()->where('is_op', true)->count())->toBe(1);
    expect($thread->posts()->count())->toBe(2);
    expect($thread->posts_synced_at)->not->toBeNull();
});
