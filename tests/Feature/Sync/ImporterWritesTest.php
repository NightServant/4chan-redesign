<?php

declare(strict_types=1);

use App\Models\Board;
use App\Models\Bookmark;
use App\Models\Post;
use App\Models\Thread;
use App\Models\User;
use App\Services\FourChan\Importer;
use App\Services\LocalPostNumbers;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Sync\Fixture;

/**
 * The board metadata, as `updateOrCreate` stored it. `upsert` casts nothing and
 * stamps nothing it is not told to, so the booleans, the decoded description,
 * the category and the dates are pinned against the recorded `boards.json`.
 */
it('stores boards exactly as the per-row writes did', function (): void {
    $this->freezeTime();

    $payload = Fixture::json('boards.json');
    $payload['boards'][] = ['board' => 'zz', 'title' => 'Unmapped', 'ws_board' => 1];

    $slugs = app(Importer::class)->importBoards($payload);

    expect($slugs)->toBe(['3', 'a', 'b', 'biz', 'g', 'pol', 'r9k', 's4s', 'wg', 'x', 'zz'])
        ->and(Board::query()->count())->toBe(11);

    $three = Board::query()->where('slug', '3')->firstOrFail();
    expect($three->title)->toBe('3DCG')
        ->and($three->description)->toBe('"/3/ - 3DCG" is 4chan\'s board for 3D modeling and imagery.')
        ->and($three->category)->toBe('Creative')
        ->and($three->worksafe)->toBeTrue()
        ->and($three->max_comment_chars)->toBe(2000)
        ->and($three->bump_limit)->toBe(310)
        ->and($three->image_limit)->toBe(150)
        ->and($three->per_page)->toBe(15)
        ->and($three->pages)->toBe(10)
        ->and($three->is_archived)->toBeTrue()
        ->and($three->synced_at?->getTimestamp())->toBe(now()->getTimestamp())
        ->and($three->created_at?->getTimestamp())->toBe(now()->getTimestamp())
        ->and($three->updated_at?->getTimestamp())->toBe(now()->getTimestamp());

    $b = Board::query()->where('slug', 'b')->firstOrFail();
    expect($b->worksafe)->toBeFalse()
        ->and($b->is_archived)->toBeFalse()
        ->and($b->category)->toBe('Misc');

    $unmapped = Board::query()->where('slug', 'zz')->firstOrFail();
    expect($unmapped->category)->toBe('Other')
        ->and($unmapped->description)->toBe('')
        ->and($unmapped->max_comment_chars)->toBe(0);
});

it('updates a stored board in place when boards.json changes', function (): void {
    $this->freezeTime();
    $importer = app(Importer::class);
    $importer->importBoards(Fixture::json('boards.json'));

    $before = Board::query()->where('slug', 'g')->firstOrFail();
    $unlisted = Board::factory()->slug('gone')->create();

    $this->travel(5)->minutes();

    $payload = Fixture::json('boards.json');
    $payload['boards'] = array_map(
        fn (array $row): array => $row['board'] === 'g' ? [...$row, 'title' => 'Renamed', 'bump_limit' => 111] : $row,
        $payload['boards'],
    );
    $importer->importBoards($payload);

    $after = Board::query()->where('slug', 'g')->firstOrFail();

    expect(Board::query()->count())->toBe(11)
        ->and($after->id)->toBe($before->id)
        ->and($after->title)->toBe('Renamed')
        ->and($after->bump_limit)->toBe(111)
        ->and($after->created_at?->getTimestamp())->toBe($before->created_at?->getTimestamp())
        ->and($after->synced_at?->getTimestamp())->toBe(now()->getTimestamp())
        ->and($after->updated_at?->getTimestamp())->toBe(now()->getTimestamp())
        ->and($unlisted->fresh()?->synced_at?->getTimestamp())->toBe($unlisted->synced_at?->getTimestamp());
});

it('writes no board for a payload with no boards in it', function (): void {
    expect(app(Importer::class)->importBoards([]))->toBe([])
        ->and(app(Importer::class)->importBoards(['boards' => [['title' => 'no slug']]]))->toBe([])
        ->and(Board::query()->count())->toBe(0);
});

/**
 * Bulk writes bypass Eloquent's casts, so the values that reach the table are
 * now the importer's own work. This pins them against the recorded thread: the
 * quote list the `array` cast used to encode, the dates the datetime cast used
 * to format, and the booleans and media group.
 */
it('stores a thread page exactly as the per-row writes did', function (): void {
    $thread = Thread::factory()->create();

    $written = app(Importer::class)->importPosts($thread, Fixture::json('g-thread-109514275.json'));

    expect($written)->toBe(6);

    $posts = $thread->posts()->orderBy('no')->get()->keyBy('no');

    $op = $posts[109514275];
    expect($op->is_op)->toBeTrue()
        ->and($op->quotes)->toBe([109502641])
        ->and($op->posted_at->getTimestamp())->toBe(1786338303)
        ->and($op->media_filename)->toBe('file')
        ->and($op->media_extension)->toBe('.jpg')
        ->and($op->media_spoiler)->toBeFalse()
        ->and($op->is_local)->toBeFalse()
        ->and($op->user_id)->toBeNull();

    $reply = $posts[109514346];
    expect($reply->is_op)->toBeFalse()
        ->and($reply->quotes)->toBe([109514287])
        ->and($reply->media_filename)->toBeNull()
        ->and($reply->media_tim)->toBeNull()
        ->and($reply->created_at)->not->toBeNull();
});

it('updates an existing thread in place when the catalog changes', function (): void {
    $board = Board::factory()->slug('g')->create();
    $catalog = Fixture::json('g-catalog.json');
    $stub = $catalog[0]['threads'][0];

    app(Importer::class)->importThreads($board, $catalog);

    $before = Thread::query()->where('no', $stub['no'])->firstOrFail();

    $catalog[0]['threads'][0]['replies'] = $stub['replies'] + 7;
    $catalog[0]['threads'][0]['sub'] = 'Renamed &amp; reopened';

    app(Importer::class)->importThreads($board, $catalog);

    $after = Thread::query()->where('no', $stub['no'])->firstOrFail();

    expect($after->id)->toBe($before->id)
        ->and($after->replies_count)->toBe($stub['replies'] + 7)
        ->and($after->subject)->toBe('Renamed & reopened')
        ->and($after->created_at->getTimestamp())->toBe($before->created_at->getTimestamp())
        ->and($board->threads()->count())->toBe(6);
});

/**
 * Local numbers start at `LocalPostNumbers::BASE`, far above anything 4chan
 * has issued, which is the only thing keeping an upstream row off a local one.
 * An upsert cannot add a `WHERE user_id IS NULL`, so the importer refuses such
 * a number outright and this holds the line.
 */
it('never overwrites a post written here', function (): void {
    $thread = Thread::factory()->create();

    $local = Post::factory()->create([
        'thread_id' => $thread->id,
        'no' => LocalPostNumbers::BASE,
        'user_id' => User::factory()->create()->id,
        'is_local' => true,
        'body' => 'written on Clover',
    ]);

    $collision = Fixture::json('g-thread-109514275.json')['posts'][1];
    $collision['no'] = LocalPostNumbers::BASE;

    app(Importer::class)->importPosts($thread, ['posts' => [$collision]]);

    expect($local->fresh()->body)->toBe('written on Clover')
        ->and($local->fresh()->user_id)->not->toBeNull();
});

/**
 * A catalog that lists exactly these thread numbers.
 *
 * @return array<int, array<string, mixed>>
 */
function catalogListing(int ...$numbers): array
{
    return [[
        'page' => 1,
        'threads' => array_map(fn (int $no): array => ['no' => $no, 'time' => 1, 'last_modified' => 1], $numbers),
    ]];
}

it('prunes a thread the catalog no longer lists', function (): void {
    $board = Board::factory()->slug('g')->create();
    $gone = Thread::factory()->for($board)->create(['no' => 100]);
    $kept = Thread::factory()->for($board)->create(['no' => 200]);
    $post = Post::factory()->create(['thread_id' => $gone->id]);

    $pruned = app(Importer::class)->pruneThreads($board, catalogListing(200));

    expect($pruned)->toBe(1)
        ->and(Thread::query()->whereKey($gone->id)->exists())->toBeFalse()
        ->and(Post::query()->whereKey($post->id)->exists())->toBeFalse()
        ->and(Thread::query()->whereKey($kept->id)->exists())->toBeTrue();
});

it('keeps a bookmarked thread the catalog no longer lists', function (): void {
    $board = Board::factory()->slug('g')->create();
    $saved = Thread::factory()->for($board)->create(['no' => 100]);
    Bookmark::factory()->create(['thread_id' => $saved->id]);

    expect(app(Importer::class)->pruneThreads($board, catalogListing(200)))->toBe(0)
        ->and(Thread::query()->whereKey($saved->id)->exists())->toBeTrue();
});

it('keeps a thread with a post written here', function (): void {
    $board = Board::factory()->slug('g')->create();
    $replied = Thread::factory()->for($board)->create(['no' => 100]);
    Post::factory()->create([
        'thread_id' => $replied->id,
        'no' => LocalPostNumbers::BASE,
        'user_id' => User::factory()->create()->id,
        'is_local' => true,
    ]);

    expect(app(Importer::class)->pruneThreads($board, catalogListing(200)))->toBe(0)
        ->and(Thread::query()->whereKey($replied->id)->exists())->toBeTrue();
});

it('keeps a thread whose only reply here came from an account since deleted', function (): void {
    $board = Board::factory()->slug('g')->create();
    $replied = Thread::factory()->for($board)->create(['no' => 100]);
    $author = User::factory()->create();
    $reply = Post::factory()->create([
        'thread_id' => $replied->id,
        'no' => LocalPostNumbers::BASE,
        'user_id' => $author->id,
        'is_local' => true,
    ]);

    $author->delete();

    expect($reply->fresh()?->user_id)->toBeNull()
        ->and($reply->fresh()?->is_local)->toBeTrue()
        ->and(app(Importer::class)->pruneThreads($board, catalogListing(200)))->toBe(0)
        ->and(Thread::query()->whereKey($replied->id)->exists())->toBeTrue()
        ->and(Post::query()->whereKey($reply->id)->exists())->toBeTrue();
});

it('prunes only the board it was given', function (): void {
    $board = Board::factory()->slug('g')->create();
    $other = Board::factory()->slug('a')->create();
    $elsewhere = Thread::factory()->for($other)->create(['no' => 100]);

    app(Importer::class)->pruneThreads($board, catalogListing(200));

    expect(Thread::query()->whereKey($elsewhere->id)->exists())->toBeTrue();
});

it('prunes nothing from a payload that lists no threads', function (): void {
    $board = Board::factory()->slug('g')->create();
    Thread::factory()->for($board)->create(['no' => 100]);

    expect(app(Importer::class)->pruneThreads($board, []))->toBe(0)
        ->and(app(Importer::class)->pruneThreads($board, [['page' => 1, 'threads' => []]]))->toBe(0)
        ->and($board->threads()->count())->toBe(1);
});

/**
 * A thread opened between sweeps shows every reply its page just brought in,
 * so its header has to quote the same page's count, not the catalog's older one.
 */
it('takes the thread counts from the page it imports', function (): void {
    $thread = Thread::factory()->create(['replies_count' => 1, 'images_count' => 1]);

    app(Importer::class)->importPosts($thread, Fixture::json('g-thread-109514275.json'));

    expect($thread->fresh())
        ->replies_count->toBe(292)
        ->images_count->toBe(44);
});

/**
 * A reply posted on Clover adds one to its thread's count, and upstream's
 * figure knows nothing of it, so each import would erase it again.
 */
it('keeps Clover replies in the count when 4chan reports its own', function (): void {
    $board = Board::factory()->create(['slug' => 'g']);
    $catalog = Fixture::json('g-catalog.json');
    app(Importer::class)->importThreads($board, $catalog);

    $stub = $catalog[0]['threads'][0];
    $thread = Thread::query()->where('no', $stub['no'])->firstOrFail();
    Post::factory()->for($thread)->create([
        'user_id' => User::factory(),
        'is_local' => true,
        'is_op' => false,
        'no' => LocalPostNumbers::next($board),
    ]);

    app(Importer::class)->importThreads($board, $catalog);

    expect($thread->fresh()->replies_count)->toBe($stub['replies'] + 1);
});

it('keeps a Clover reply in the count after its author deletes their account', function (): void {
    $board = Board::factory()->create(['slug' => 'g']);
    $catalog = Fixture::json('g-catalog.json');
    app(Importer::class)->importThreads($board, $catalog);

    $stub = $catalog[0]['threads'][0];
    $thread = Thread::query()->where('no', $stub['no'])->firstOrFail();
    Post::factory()->for($thread)->create([
        'user_id' => null,
        'is_local' => true,
        'is_op' => false,
        'no' => LocalPostNumbers::next($board),
    ]);

    app(Importer::class)->importThreads($board, $catalog);

    expect($thread->fresh()->replies_count)->toBe($stub['replies'] + 1);
});

/**
 * A reply posted on Clover, as `ReplyController` writes it.
 */
function localReplyOn(Thread $thread): Post
{
    return Post::factory()->for($thread)->create([
        'user_id' => null,
        'is_local' => true,
        'is_op' => false,
        'no' => LocalPostNumbers::next($thread->board),
    ]);
}

it('adds every Clover reply to the count, however many a thread has', function (): void {
    $board = Board::factory()->create(['slug' => 'g']);
    $catalog = Fixture::json('g-catalog.json');
    app(Importer::class)->importThreads($board, $catalog);

    $first = $catalog[0]['threads'][0];
    $second = $catalog[0]['threads'][1];
    $threadOne = Thread::query()->where('no', $first['no'])->firstOrFail();
    $threadTwo = Thread::query()->where('no', $second['no'])->firstOrFail();
    localReplyOn($threadOne);
    localReplyOn($threadOne);
    localReplyOn($threadTwo);

    app(Importer::class)->importThreads($board, $catalog);

    expect($threadOne->fresh()->replies_count)->toBe($first['replies'] + 2)
        ->and($threadTwo->fresh()->replies_count)->toBe($second['replies'] + 1);
});

it('leaves a thread the catalog does not list alone', function (): void {
    $board = Board::factory()->create(['slug' => 'g']);
    $catalog = Fixture::json('g-catalog.json');
    $unlisted = Thread::factory()->for($board)->create(['replies_count' => 7]);
    localReplyOn($unlisted);

    app(Importer::class)->importThreads($board, $catalog);

    expect($unlisted->fresh()->replies_count)->toBe(7);
});

it('does not take a reply from another board\'s thread of the same number', function (): void {
    $board = Board::factory()->create(['slug' => 'g']);
    $other = Board::factory()->create(['slug' => 'a']);
    $catalog = Fixture::json('g-catalog.json');
    $stub = $catalog[0]['threads'][0];

    $elsewhere = Thread::factory()->for($other)->create(['no' => $stub['no'], 'replies_count' => 3]);
    localReplyOn($elsewhere);

    app(Importer::class)->importThreads($board, $catalog);

    expect(Thread::query()->where('board_id', $board->id)->where('no', $stub['no'])->value('replies_count'))->toBe($stub['replies'])
        ->and($elsewhere->fresh()->replies_count)->toBe(3);
});

it('counts Clover replies once however often the same catalog is imported', function (): void {
    $board = Board::factory()->create(['slug' => 'g']);
    $catalog = Fixture::json('g-catalog.json');
    app(Importer::class)->importThreads($board, $catalog);

    $stub = $catalog[0]['threads'][0];
    $thread = Thread::query()->where('no', $stub['no'])->firstOrFail();
    localReplyOn($thread);
    localReplyOn($thread);

    app(Importer::class)->importThreads($board, $catalog);
    app(Importer::class)->importThreads($board, $catalog);

    expect($thread->fresh()->replies_count)->toBe($stub['replies'] + 2);
});

/**
 * `clover:sync` holds no lock against a visitor's live fetch, so two imports of
 * the same board can interleave. The second one here runs the moment the first
 * has written its threads, which is the worst point to arrive at.
 */
it('counts Clover replies once when two imports overlap', function (): void {
    $board = Board::factory()->create(['slug' => 'g']);
    $catalog = Fixture::json('g-catalog.json');
    app(Importer::class)->importThreads($board, $catalog);

    $stub = $catalog[0]['threads'][0];
    $thread = Thread::query()->where('no', $stub['no'])->firstOrFail();
    localReplyOn($thread);
    localReplyOn($thread);

    $overlapped = false;

    DB::listen(function (QueryExecuted $query) use (&$overlapped, $board, $catalog): void {
        if ($overlapped || ! str_contains($query->sql, 'into "threads"')) {
            return;
        }

        $overlapped = true;
        app(Importer::class)->importThreads($board, $catalog);
    });

    app(Importer::class)->importThreads($board, $catalog);

    expect($overlapped)->toBeTrue()
        ->and($thread->fresh()->replies_count)->toBe($stub['replies'] + 2);
});

it('keeps Clover replies in the count when a thread page reports 4chan\'s', function (): void {
    $thread = Thread::factory()->create();
    foreach ([0, 1] as $offset) {
        Post::factory()->for($thread)->create([
            'user_id' => User::factory(),
            'is_local' => true,
            'is_op' => false,
            'no' => LocalPostNumbers::BASE + $offset,
        ]);
    }

    app(Importer::class)->importPosts($thread, Fixture::json('g-thread-109514275.json'));

    expect($thread->fresh()->replies_count)->toBe(292 + 2)
        ->and($thread->replies_count)->toBe(292 + 2);
});

it('does not count a Clover reply twice when the page carries no count', function (): void {
    $thread = Thread::factory()->create(['replies_count' => 5]);
    Post::factory()->for($thread)->create([
        'user_id' => User::factory(),
        'is_local' => true,
        'is_op' => false,
        'no' => LocalPostNumbers::next($thread->board),
    ]);

    app(Importer::class)->importPosts($thread, ['posts' => [['no' => 1, 'resto' => 0, 'time' => 1]]]);

    expect($thread->fresh()->replies_count)->toBe(5);
});
