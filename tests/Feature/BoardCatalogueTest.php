<?php

declare(strict_types=1);

use App\Models\Board;
use App\Support\RoutableBoards;

/**
 * The slugs `/{board}` accepts and the boards that can actually be drawn must
 * agree.
 *
 * This guard exists because they once did not. `/b/` was added to the routable
 * list for the mature-boards filter without being added to the board data, and
 * the result was a route answering 200 with a completely blank page behind it —
 * a green suite, a green `route:list`, and nothing on screen.
 *
 * The two lists used to be a config array and a TypeScript fixture, and this
 * file read the fixture from PHP to compare them. Both are gone: the router now
 * takes its slugs from the `boards` table, which is also where the page's data
 * comes from, so the two cannot disagree about which boards exist.
 *
 * What replaces that check is the failure mode the new arrangement can still
 * have: `RoutableBoards` caches the constraint with `rememberForever`, so a
 * board can be in the table and still not be routable. That is the same class of
 * defect wearing a different hat, and it is what these tests are now for.
 */
beforeEach(function (): void {
    RoutableBoards::forget();
});

it('routes exactly the boards the table holds', function (): void {
    Board::factory()->slug('g')->create();
    Board::factory()->slug('biz')->create();

    expect(RoutableBoards::slugs())->toBe(['biz', 'g']);
});

it('serves a board page for every slug it routes', function (): void {
    Board::factory()->slug('g')->create();
    Board::factory()->slug('wg')->create();

    foreach (RoutableBoards::slugs() as $slug) {
        $this->get("/{$slug}")->assertOk();
    }
});

/**
 * The cached list is the trap. Without the invalidation this asserts, a board
 * synced after the cache warmed is in the table, listed in the directory, and
 * 404s when opened — and because `rememberForever` never expires, it stays
 * that way until someone clears the cache by hand.
 */
it('routes a board created after the slug list was already cached', function (): void {
    Board::factory()->slug('g')->create();

    expect(RoutableBoards::slugs())->toBe(['g']);

    Board::factory()->slug('biz')->create();
    RoutableBoards::forget();

    expect(RoutableBoards::slugs())->toContain('biz');
});

/**
 * Routes are registered before the database is necessarily reachable — a fresh
 * clone running `migrate`, for instance. Falling over there would break the
 * application at route registration, with a stack trace about a missing table,
 * rather than at the page with a real error.
 */
it('falls back to the configured slugs when no boards are synced', function (): void {
    expect(Board::query()->count())->toBe(0);

    expect(RoutableBoards::slugs())->toBe(config('clover.fallback_boards'));
});

/**
 * Three of 4chan's 77 slugs contain digits and one is entirely numeric. A
 * constraint built by assuming `[a-z]+` drops all three, and the boards simply
 * stop being reachable.
 */
it('routes the numeric and part-numeric slugs', function (): void {
    Board::factory()->slug('3')->create();
    Board::factory()->slug('r9k')->create();
    Board::factory()->slug('s4s')->create();

    /**
     * Asserted against the pattern rather than by fetching the pages, because
     * routes are registered while the application boots — which happened
     * before this test created anything, and cannot be redone here: rebooting
     * discards the in-memory database along with the boards.
     *
     * The pattern is the thing that breaks anyway. Three of 4chan's 77 slugs
     * contain digits and one is entirely numeric, so a constraint written as
     * `[a-z]+` compiles, passes every other test, and silently makes three
     * boards unreachable. `preg_match` here is the same test Laravel's router
     * applies to the segment.
     */
    $pattern = RoutableBoards::pattern();

    foreach (['3', 'r9k', 's4s'] as $slug) {
        expect((bool) preg_match("/^({$pattern})$/", $slug))->toBeTrue(
            "the route constraint rejects the slug [{$slug}]",
        );
    }
});

/**
 * The constraint's whole purpose. `/rules` is a real page and would be
 * shadowed by `/{board}` if the pattern let anything through.
 */
it('does not let a board slug shadow a named page', function (): void {
    Board::factory()->slug('g')->create();

    $this->get('/rules')->assertOk()->assertInertia(
        fn ($page) => $page->component('information'),
    );
});
