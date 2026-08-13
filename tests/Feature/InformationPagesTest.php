<?php

declare(strict_types=1);

/**
 * Clover's standing pages, and the six that were deliberately removed.
 *
 * There were twelve. Eleven resolved to a screen saying they had not been
 * written, which was honest and still wrong: the footer is a map of the
 * product, and it advertised a janitor queue, a report flow, a contribution
 * guide, a status page, a DMCA process and a contact address for a read-only
 * mirror that has none of them.
 *
 * Task 4 originally shipped four of these as live 404s in the sidebar footer,
 * which is what this file was written to prevent. That guard still matters for
 * the pages that remain, so it is kept and narrowed rather than deleted.
 */
it('serves every linked information page', function (string $uri): void {
    $this->get($uri)->assertOk();
})->with([
    '/rules',
    '/faq',
    '/terms',
    '/privacy',
    '/search',
]);

/**
 * The other half of the guard. A route left registered for a page nothing
 * links to is how a footer quietly grows back the entries that were removed
 * from it, so their absence is asserted rather than assumed.
 */
it('does not serve a page for a feature Clover does not have', function (string $uri): void {
    $this->get($uri)->assertNotFound();
})->with([
    '/dmca',
    '/contact',
    '/janitors',
    '/report',
    '/contribute',
]);

it('serves information pages to signed-out visitors', function (): void {
    $this->assertGuest();

    $this->get('/terms')->assertOk();
    $this->get('/rules')->assertOk();
});

/**
 * Four of the five carry real copy now rather than an apology for being empty.
 * `search` is the exception and keeps the placeholder, because it is a real
 * destination with a real feature behind it that has not been built.
 */
it('writes real content on the pages that describe what Clover does', function (string $uri): void {
    $this->get($uri)
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('information'));
})->with(['/rules', '/faq', '/terms', '/privacy']);
