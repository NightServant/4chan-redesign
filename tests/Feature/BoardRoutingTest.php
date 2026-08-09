<?php

declare(strict_types=1);

/**
 * Board and thread URLs keep the imageboard's own shape: `/g/` for a board and
 * `/g/58210441` for a thread.
 *
 * That shape collides with every other single-segment route on the site, so
 * the board parameter is constrained to known slugs. Without the constraint
 * `/rules` would resolve as a board named "rules" and shadow the real page.
 * These tests pin both halves: real slugs resolve, and the site's own pages
 * keep winning.
 */
it('serves a board page for each known slug', function (string $slug): void {
    $this->get("/{$slug}")->assertOk();
})->with(['g', 'wg', 'biz', 'x', 'fit', 'co']);

it('does not treat an unknown slug as a board', function (): void {
    $this->get('/notaboard')->assertNotFound();
});

it('never shadows the site pages that share the URL shape', function (string $uri): void {
    $this->get($uri)->assertOk();
})->with(['/popular', '/latest', '/communities', '/rules', '/faq', '/terms']);

it('serves a thread page under its board', function (): void {
    $this->get('/g/58210441')->assertOk();
});

it('rejects a thread number that is not a number', function (): void {
    $this->get('/g/not-a-post')->assertNotFound();
});
