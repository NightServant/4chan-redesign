<?php

declare(strict_types=1);

/**
 * The routable board slugs and the board data the pages render must agree.
 *
 * `config/clover.php` decides what `/{board}` accepts; the `BOARDS` fixture
 * decides what the board page can draw. When a slug is in the first and not
 * the second, the route answers 200 and the page renders nothing at all,
 * because `BOARDS.find()` misses and the component returns null. A blank white
 * page, with a green test suite behind it.
 *
 * That happened the moment `/b/` was added to the config for the mature-boards
 * filter without being added to the fixture. Reading the fixture from PHP is
 * crude, but the alternative is trusting two hand-maintained lists to stay in
 * step, which is what failed.
 */
function fixtureBoardSlugs(): array
{
    $source = (string) file_get_contents(
        resource_path('js/fixtures/clover.ts'),
    );

    $boardsBlock = str_contains($source, 'export const BOARDS')
        ? substr($source, strpos($source, 'export const BOARDS') ?: 0)
        : '';

    $boardsBlock = substr($boardsBlock, 0, strpos($boardsBlock, '] as const;') ?: 0);

    preg_match_all("/slug: '\/([a-z]+)\/'/", $boardsBlock, $matches);

    return $matches[1];
}

it('can render a board page for every slug the router accepts', function (): void {
    $routable = config('clover.boards');
    $renderable = fixtureBoardSlugs();

    expect($renderable)->not->toBeEmpty('the BOARDS fixture could not be read');

    expect(array_values(array_diff($routable, $renderable)))->toBe(
        [],
        'these slugs route but have no board data, so the page renders blank',
    );
});

it('does not carry board data the router will refuse', function (): void {
    $routable = config('clover.boards');
    $renderable = fixtureBoardSlugs();

    expect(array_values(array_diff($renderable, $routable)))->toBe(
        [],
        'these boards would be listed but 404 when opened',
    );
});

/**
 * Looped rather than a dataset: a dataset is resolved while the test file is
 * being collected, before the application is booted, so `config()` is not
 * reliably available to it there.
 */
it('serves a board page for every configured slug', function (): void {
    foreach (config('clover.boards') as $slug) {
        $this->get("/{$slug}")->assertOk();
    }
});
