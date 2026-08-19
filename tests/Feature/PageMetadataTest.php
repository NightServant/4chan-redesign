<?php

declare(strict_types=1);

use App\Models\Board;
use App\Models\Post;
use App\Models\Thread;
use App\Support\PageMetadata;

/**
 * The title and description each URL actually serves.
 *
 * `SocialMetaTest` next door asserts the tags are *present* without
 * JavaScript. They were, and they were also identical on every page: one
 * title, one description, for the homepage, the FAQ, every board, every thread
 * and every error. Twenty-six distinct titles existed in the page components
 * and none of them were on the wire, because Inertia's `<Head>` writes them
 * after hydration and SSR is configured but has no entry point, no bundle and
 * no running process.
 *
 * So these assert distinctness, against the served HTML. A component test
 * would have passed the whole time the bug shipped — it was passing, in the
 * suite, while `curl` returned `<title>Clover</title>` for every URL on the
 * site.
 */
function titleOf(string $html): string
{
    preg_match('/<title>(.*?)<\/title>/s', $html, $matches);

    return trim($matches[1] ?? '');
}

function descriptionOf(string $html): string
{
    preg_match('/<meta head-key="description" name="description" content="(.*?)">/s', $html, $matches);

    return trim($matches[1] ?? '');
}

it('serves a distinct title for each of its own pages', function (): void {
    $titles = collect(['/', '/communities', '/status', '/rules', '/faq', '/terms', '/privacy'])
        ->mapWithKeys(fn (string $path) => [
            $path => titleOf($this->get($path)->getContent()),
        ]);

    expect($titles->values()->unique())->toHaveCount($titles->count());
    expect($titles['/faq'])->toBe('FAQ');
    expect($titles['/privacy'])->toBe('Privacy');
    expect($titles['/communities'])->toBe('Communities');
});

it('serves a distinct description for each of its own pages', function (): void {
    $descriptions = collect(['/rules', '/faq', '/terms', '/privacy'])
        ->map(fn (string $path) => descriptionOf($this->get($path)->getContent()));

    expect($descriptions->unique())->toHaveCount(4);
    expect($descriptions->filter())->toHaveCount(4);
});

it('names the board in the title of a board page', function (): void {
    $board = Board::factory()->create([
        'slug' => 'g',
        'title' => 'Technology',
        'worksafe' => true,
    ]);

    $html = $this->get("/{$board->slug}")->getContent();

    expect(titleOf($html))->toBe('/g/ — Technology');
    expect(descriptionOf($html))->toContain('Technology on Clover');
});

it('names the thread in the title of a thread page', function (): void {
    $board = Board::factory()->create(['slug' => 'g', 'worksafe' => true]);
    $thread = Thread::factory()->for($board)->create([
        'subject' => 'Anons are still arguing about init systems',
        'replies_count' => 318,
    ]);
    Post::factory()->for($thread)->create(['is_op' => true, 'no' => $thread->no]);

    $html = $this->get("/{$board->slug}/{$thread->no}")->getContent();

    expect(titleOf($html))->toBe('Anons are still arguing about init systems');
    expect(descriptionOf($html))->toContain('318 replies');
});

/**
 * A pruned thread is the ordinary case on an imageboard, not an error, and it
 * gets its own words rather than the site default.
 */
it('says so in the title when a thread is not there', function (): void {
    $board = Board::factory()->create(['slug' => 'g', 'worksafe' => true]);

    $html = $this->get("/{$board->slug}/999999999")->getContent();

    expect(titleOf($html))->toBe('Thread not found');
});

it('titles an error page by what went wrong', function (): void {
    expect(titleOf($this->get('/no-such-page-exists')->getContent()))
        ->toBe('No such page');
});

/**
 * Exactly one, which is not a formality: the shell renders a `<title>` inside
 * `<x-inertia::head>` and the client head manager writes another after
 * hydration. If the `head-key` contract between them ever breaks, this is
 * where it shows up.
 */
it('serves exactly one title element per page', function (string $path): void {
    $html = $this->get($path)->getContent();

    expect(substr_count($html, '<title>'))->toBe(1);
})->with(['/', '/faq', '/communities', '/status']);

/**
 * The summaries live twice: in PHP for the crawler, in TypeScript for the
 * page. That is a real cost, accepted because the alternative is a crawler
 * receiving nothing specific about the page describing what Clover does with
 * your data. This is what keeps the two honest.
 */
it('keeps the PHP summaries word for word identical to the page copy', function (): void {
    $copy = file_get_contents(resource_path('js/content/information.ts'));

    expect($copy)->not->toBeFalse();

    /* The TypeScript file writes typographic apostrophes and dashes in places;
       compare on the same footing rather than on the byte. */
    $haystack = str_replace(['’', '—'], ["'", '-'], (string) $copy);

    $drifted = collect(PageMetadata::informationSummaries())
        ->reject(fn (string $summary) => str_contains(
            $haystack,
            str_replace(['’', '—'], ["'", '-'], $summary),
        ))
        ->keys();

    expect($drifted)->toBeEmpty();
});

/**
 * robots.txt is a static file the web server hands out, so this reads it off
 * disk rather than through the router.
 *
 * Clover indexes its own pages and asks search engines to leave the mirrored
 * 4chan content alone: it is not Clover's to publish, the adult-board opt-in
 * cannot travel with a search result, and threads pruned upstream become dead
 * results. Board slugs share no prefix with the site's own routes, so the file
 * has to allow the known pages and disallow the rest.
 */
it('asks crawlers for its own pages and not the mirror', function (): void {
    $robots = (string) file_get_contents(public_path('robots.txt'));

    expect($robots)->toContain('Disallow: /');
    expect($robots)->toContain('Disallow: /search');

    foreach (['/communities', '/status', '/rules', '/faq', '/terms', '/privacy'] as $allowed) {
        expect($robots)->toContain("Allow: {$allowed}");
    }
});
