<?php

declare(strict_types=1);

use App\Models\Board;
use App\Models\Thread;
use App\Models\User;
use App\Support\RoutableBoards;
use Illuminate\Foundation\Vite;
use Illuminate\Foundation\ViteException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia;
use Symfony\Component\Finder\Finder;

/**
 * Perceived speed: the body font arrives with the document, and the counts in
 * the sidebar and the feed's rail are not recounted on every request.
 *
 * The asset checks read the built manifest, so they need `npm run build`
 * first, as `DesignFoundationTest` does. CI builds before running Pest.
 */
beforeEach(function (): void {
    RoutableBoards::forget();
});

/**
 * @return array<string, array<string, mixed>>
 */
function builtManifest(): array
{
    $path = public_path('build/manifest.json');

    if (! file_exists($path)) {
        test()->markTestSkipped('Assets are not built. Run `npm run build`.');
    }

    /** @var array<string, array<string, mixed>> */
    return json_decode((string) file_get_contents($path), true);
}

/**
 * Queries one request makes, counting the cache's own reads and writes.
 *
 * Production's cache store is the database, so a cache hit there is a round
 * trip to Neon, not free. The suite's default store is `array`, which would
 * make every cached read look like zero queries, so the tests that call this
 * switch to the store production uses and the count is the one that matters.
 *
 * Each call owns its counter. `DB::listen` listeners accumulate, so two calls
 * sharing one would report a running total.
 */
function queriesFor(string $uri): int
{
    $queries = 0;
    DB::listen(function () use (&$queries): void {
        $queries++;
    });

    test()->get($uri)->assertOk();

    return $queries;
}

/**
 * One worksafe board with one thread, one not-worksafe board with two.
 */
function seedSafeAndAdultBoards(): void
{
    $safe = Board::factory()->slug('g')->create(['synced_at' => now()]);
    $adult = Board::factory()->slug('b')->notWorksafe()->create(['synced_at' => now()]);

    Thread::factory()->for($safe)->create();
    Thread::factory()->for($adult)->count(2)->create();
}

describe('the body font', function (): void {
    it('is preloaded at the URL the stylesheet resolves it to', function (): void {
        $manifest = builtManifest();
        $css = (string) file_get_contents(public_path('build/'.$manifest['resources/css/app.css']['file']));

        preg_match('#url\(([^)]*Inter-Variable[^)]*\.woff2)\)#', $css, $inCss);

        $html = $this->get('/')->assertOk()->getContent();

        preg_match(
            '#<link rel="preload" as="font" type="font/woff2" href="([^"]*Inter-Variable[^"]*\.woff2)" crossorigin>#',
            (string) $html,
            $preload,
        );

        expect($inCss)->not->toBeEmpty('the stylesheet no longer loads Inter-Variable.woff2');
        expect($preload)->not->toBeEmpty('the page does not preload Inter-Variable.woff2');

        // One URL, or the font is fetched twice. The stylesheet writes a path
        // and the preload an absolute URL; the browser compares them resolved,
        // scheme and host included, so `url()` resolves the path the way the
        // page's own origin does.
        expect($preload[1])->toBe(url($inCss[1]));
    });

    it('preloads only the regular Inter, not the italic or the display face', function (): void {
        $html = (string) $this->get('/')->assertOk()->getContent();

        expect(substr_count($html, 'as="font"'))->toBe(1);
        expect($html)->not->toContain('Inter-Italic');
        expect($html)->not->toContain('SpaceGrotesk');
    });
});

describe('the production build', function (): void {
    it('ships no test files', function (): void {
        $manifest = builtManifest();

        // `account.test.tsx` as a source, `assets/account.test-25t4v01k.js` as
        // a file, and the shared `assets/test.DNmyFkvJ-*.js` the tests pull in.
        $tests = collect([...array_keys($manifest), ...array_column($manifest, 'file')])
            ->filter(fn (string $name): bool => preg_match('#(^|[/._])test[.-]#', $name) === 1)
            ->values()
            ->all();

        expect($tests)->toBe([], 'the page resolver is bundling *.test.tsx files into public/build');
    });

    it('still renders every page', function (): void {
        $pages = collect(Finder::create()->files()->in(resource_path('js/pages'))->name('*.tsx')->notName('*.test.tsx'))
            ->map(fn ($file): string => Str::beforeLast($file->getRelativePathname(), '.tsx'));

        expect($pages)->not->toBeEmpty();

        // What `app.blade.php` asks of Vite for a page: its own chunk. It
        // throws when the manifest has none, which is a blank screen.
        $unrenderable = $pages
            ->reject(function (string $component): bool {
                try {
                    app(Vite::class)(["resources/js/pages/{$component}.tsx"]);

                    return true;
                } catch (ViteException) {
                    return false;
                }
            })
            ->values()
            ->all();

        expect($unrenderable)->toBe([]);
    });
});

describe('the sidebar and the rail counts', function (): void {
    beforeEach(function (): void {
        config(['cache.default' => 'database']);
    });

    it('does not recount on every request', function (): void {
        Board::factory()->slug('g')->create();

        $cold = queriesFor('/popular');
        $warm = queriesFor('/popular');

        // Cold: two sidebar counts and three rail counts, plus a cache miss and
        // a cache write for each of the two keys. Warm: one cache read each.
        expect($warm)->toBeLessThan($cold);
    });

    it('does not recount the sidebar on a board page either', function (): void {
        Board::factory()->slug('g')->create();

        $cold = queriesFor('/g');
        $warm = queriesFor('/g');

        expect($warm)->toBeLessThan($cold);
    });

    it('is at most a minute behind the database, and no further', function (): void {
        $board = Board::factory()->slug('g')->create(['synced_at' => now()]);
        Thread::factory()->for($board)->create();

        $this->get('/popular')->assertInertia(fn (AssertableInertia $page) => $page
            ->where('library.threads', '1'));

        Thread::factory()->for($board)->create();

        // Inside the minute the figure is the one the database held.
        $this->get('/popular')->assertInertia(fn (AssertableInertia $page) => $page
            ->where('library.threads', '1'));

        $this->travel(61)->seconds();

        $this->get('/popular')->assertInertia(fn (AssertableInertia $page) => $page
            ->where('library.threads', '2'));
    });

    it('does not hand the signed-out view to an anon who shows adult boards', function (): void {
        seedSafeAndAdultBoards();

        $this->get('/popular')->assertInertia(fn (AssertableInertia $page) => $page
            ->where('library.boards', '1')
            ->where('library.threads', '1')
            ->where('library.complete', false)
            ->has('sidebarBoards', 1));

        // The cache is warm for the filtered view. If the key ignored
        // visibility, this anon would be told the database is smaller than it is.
        $this->actingAs(User::factory()->create(['shows_mature_boards' => true]))
            ->get('/popular')
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('library.boards', '2')
                ->where('library.threads', '3')
                ->where('library.complete', true)
                ->has('sidebarBoards', 2));
    });

    it('does not hand the adult view to an anon who hides adult boards', function (): void {
        seedSafeAndAdultBoards();

        $this->actingAs(User::factory()->create(['shows_mature_boards' => true]))->get('/popular');
        $this->app['auth']->forgetGuards();

        // The opposite order, and the worse leak: it would name a board this
        // anon asked not to be shown.
        $this->get('/popular')->assertInertia(fn (AssertableInertia $page) => $page
            ->where('library.boards', '1')
            ->where('library.threads', '1')
            ->has('sidebarBoards', 1));
    });

    it('never shares one anon\'s subscriptions with another', function (): void {
        $board = Board::factory()->slug('g')->create();
        $member = User::factory()->create();
        $other = User::factory()->create();
        $board->subscribers()->attach($member);

        // Same visibility, same minute: one cache entry between them. The
        // sidebar says whether *this* anon follows each board, so that part
        // cannot be cached with the rest.
        $this->actingAs($member)->get('/popular')->assertInertia(fn (AssertableInertia $page) => $page
            ->where('sidebarBoards.0.subscribed', true));

        $this->actingAs($other)->get('/popular')->assertInertia(fn (AssertableInertia $page) => $page
            ->where('sidebarBoards.0.subscribed', false));
    });
});
