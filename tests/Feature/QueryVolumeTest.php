<?php

declare(strict_types=1);

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\Attachment;
use App\Models\Board;
use App\Models\Post;
use App\Models\Thread;
use App\Models\User;
use App\Support\RoutableBoards;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * How many round trips a request costs, on a database that is a network hop
 * away and bills by the compute hour.
 *
 * Each query here is a trip to Neon in production. The thread page, the
 * deferred replies, the drawer and hover prefetch all build the same reply
 * tree, so a query per image there is paid many times over.
 */
beforeEach(function (): void {
    RoutableBoards::forget();
});

/**
 * The SQL one request runs. Each call owns its list: `DB::listen` listeners
 * accumulate, so a shared one would report a running total.
 *
 * @return list<string>
 */
function queriesRunBy(callable $request): array
{
    $queries = [];
    DB::listen(function (QueryExecuted $query) use (&$queries): void {
        $queries[] = $query->sql;
    });

    $request();

    return $queries;
}

function threadWithImages(Board $board, int $images): Thread
{
    $thread = Thread::factory()->for($board)->synced()->create();
    Post::factory()->for($thread)->op()->withMedia()->create(['no' => $thread->no]);
    Post::factory()->count($images)->for($thread)->withMedia()->create();

    return $thread;
}

describe('the reply tree', function (): void {
    /**
     * Every image builds its URL from the board's slug or worksafe flag. A
     * post that does not know its thread fetched the thread, then the
     * thread's board: two queries an image, nine for one and forty-seven
     * for twenty.
     */
    it('costs the same however many replies carry an image', function (): void {
        $board = Board::factory()->slug('g')->create(['synced_at' => now()]);
        $one = threadWithImages($board, 1);
        $twenty = threadWithImages($board, 20);

        $this->get("/g/{$one->no}")->assertOk();

        $forOne = queriesRunBy(fn () => $this->get("/g/{$one->no}")->assertOk());
        $forTwenty = queriesRunBy(fn () => $this->get("/g/{$twenty->no}")->assertOk());

        expect(count($forTwenty))->toBe(count($forOne));
    });

    /** The same holds for the opening posts on a board's catalogue. */
    it('costs the same however many threads open with an image', function (): void {
        $one = Board::factory()->slug('g')->create(['synced_at' => now(), 'worksafe' => true]);
        $ten = Board::factory()->slug('wg')->create(['synced_at' => now(), 'worksafe' => true]);
        threadWithImages($one, 0);
        foreach (range(1, 10) as $ignored) {
            threadWithImages($ten, 0);
        }

        $this->get('/g')->assertOk();
        $this->get('/wg')->assertOk();

        $forOne = queriesRunBy(fn () => $this->get('/g')->assertOk());
        $forTen = queriesRunBy(fn () => $this->get('/wg')->assertOk());

        expect(count($forTen))->toBe(count($forOne));
    });
});

describe('shared page data', function (): void {
    /**
     * Recent activity, notifications and the sidebar are computed when a page
     * renders them, not on every request that passes the middleware. A
     * partial reload that asks only for `auth`, an infinite-scroll page and
     * an image all pass it and need none of the three.
     */
    it('is left as closures until a page asks for it', function (): void {
        $this->actingAs(User::factory()->create());
        $request = Request::create('/');
        $request->setUserResolver(fn () => auth()->user());

        $ran = queriesRunBy(function () use ($request, &$shared): void {
            $shared = app(HandleInertiaRequests::class)->share($request);
        });

        foreach (['recentActivity', 'threadNotifications', 'sidebarBoards', 'sidebarTrending'] as $key) {
            expect($shared[$key])->toBeInstanceOf(Closure::class);
        }
        expect($ran)->toBe([]);
    });

    it('is not computed for a signed-in reader fetching a mature image', function (): void {
        $board = Board::factory()->slug('b')->state(['worksafe' => false])->create();
        $thread = Thread::factory()->for($board)->create();
        $post = Post::factory()->for($thread)->create(['media_filename' => 'x230', 'media_extension' => '.png']);
        $attachment = Attachment::factory()->for($post)->create();
        $post->forceFill(['media_path' => $attachment->uuid])->save();

        $this->actingAs(User::factory()->create(['shows_mature_boards' => true]));

        $ran = queriesRunBy(
            fn () => $this->get("/attachments/{$attachment->uuid}/mature")->assertOk(),
        );

        expect(implode("\n", $ran))
            ->not->toContain('bookmarks')
            ->not->toContain('thread_reads')
            ->not->toContain('threads_count');
    });

    /** A full visit still carries all four, resolved. */
    it('still reaches a page that renders it', function (): void {
        Board::factory()->slug('g')->create(['synced_at' => now()]);
        $this->actingAs(User::factory()->create());

        $this->get('/')->assertInertia(fn ($page) => $page
            ->has('recentActivity')
            ->has('threadNotifications')
            ->has('sidebarBoards')
            ->has('sidebarTrending'));
    });
});
