<?php

declare(strict_types=1);

use App\Models\Board;
use App\Models\Post;
use App\Models\Thread;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia;

/**
 * What a search term is allowed to be, and what a `LIKE` does with it.
 *
 * Two separate problems that meet in the same three characters. The term is
 * read off the query string, wrapped in `%` and handed to an unindexable
 * `LIKE` over every post -- so its length is a cost the caller sets and the
 * server pays. And the escaping that keeps a literal `%` from matching
 * everything only works if the driver is told which character escapes, which
 * SQLite is not told by default.
 */

/** Every binding any query in the closure was run with, flattened. */
function bindingsDuring(Closure $work): array
{
    $bindings = [];

    DB::listen(function ($query) use (&$bindings): void {
        foreach ($query->bindings as $binding) {
            $bindings[] = $binding;
        }
    });

    $work();

    return $bindings;
}

it('does not send an over-long term to the database', function (): void {
    $overlong = str_repeat('a', 400);

    $bindings = bindingsDuring(function () use ($overlong): void {
        $this->get('/search?q='.$overlong)->assertOk();
    });

    foreach ($bindings as $binding) {
        expect(is_string($binding) ? strlen($binding) : 0)->toBeLessThan(strlen($overlong));
    }
});

it('does not send an over-long term to the database from suggest', function (): void {
    $overlong = str_repeat('a', 400);

    $bindings = bindingsDuring(function () use ($overlong): void {
        $this->getJson('/search/suggest?q='.$overlong)->assertOk();
    });

    foreach ($bindings as $binding) {
        expect(is_string($binding) ? strlen($binding) : 0)->toBeLessThan(strlen($overlong));
    }
});

/** The page echoes back what it actually searched for, so the cap shows. */
it('tells the page how much of the term it searched', function (): void {
    $this->get('/search?q='.str_repeat('a', 400))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('query', str_repeat('a', 100))
            ->etc(),
        );
});

/** A term of ordinary length is untouched by the cap. */
it('leaves an ordinary term alone', function (): void {
    $board = Board::factory()->slug('g')->create(['title' => 'Technology']);
    $thread = Thread::factory()->for($board)->create(['subject' => 'RISC-V laptops']);
    Post::factory()->for($thread)->op()->create();

    $this->getJson('/search/suggest?q=RISC-V')
        ->assertOk()
        ->assertJsonPath('threads.0.title', 'RISC-V laptops');
});

/**
 * `%` is a wildcard, so it is escaped -- but SQLite applies no `ESCAPE`
 * character unless the statement names one, so the backslash the escaping adds
 * was being matched literally and a search for `100%` found nothing.
 */
it('finds a thread whose subject contains a literal percent sign', function (): void {
    $board = Board::factory()->slug('g')->create();
    $thread = Thread::factory()->for($board)->create(['subject' => 'Battery at 100% after a year']);
    Post::factory()->for($thread)->op()->create();

    $this->getJson('/search/suggest?q=100%25')
        ->assertOk()
        ->assertJsonPath('threads.0.title', 'Battery at 100% after a year');
});

it('finds a thread whose subject contains a literal underscore', function (): void {
    $board = Board::factory()->slug('g')->create();
    $thread = Thread::factory()->for($board)->create(['subject' => 'Rename to boot_config']);
    Post::factory()->for($thread)->op()->create();

    $this->getJson('/search/suggest?q=boot_config')
        ->assertOk()
        ->assertJsonPath('threads.0.title', 'Rename to boot_config');
});

/** And the wildcard still does not leak: `%` alone is a term, not "everything". */
it('does not treat a bare percent sign as a wildcard', function (): void {
    $board = Board::factory()->slug('g')->create();
    $thread = Thread::factory()->for($board)->create(['subject' => 'Nothing special here']);
    Post::factory()->for($thread)->op()->create();

    $this->getJson('/search/suggest?q=%25')
        ->assertOk()
        ->assertJsonCount(0, 'threads');
});

/** The escape character itself is a term like any other. */
it('does not treat a bare backslash as an escape', function (): void {
    $board = Board::factory()->slug('g')->create();
    $thread = Thread::factory()->for($board)->create(['subject' => 'Path is C:\\Users']);
    Post::factory()->for($thread)->op()->create();

    $this->getJson('/search/suggest?q='.urlencode('C:\\Users'))
        ->assertOk()
        ->assertJsonPath('threads.0.title', 'Path is C:\\Users');
});
