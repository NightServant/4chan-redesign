<?php

declare(strict_types=1);

/**
 * The utility destinations the sidebar footer and the homepage footer link to.
 *
 * None of these screens are written yet, but they are all linked from live
 * chrome, so they resolve to a plain "not written yet" page rather than a 404.
 * Task 4 shipped four of these as real 404s in the sidebar footer, which is the
 * exact failure that task argued against; these tests exist so it cannot
 * silently happen again.
 */
it('serves every linked information page', function (string $uri): void {
    $this->get($uri)->assertOk();
})->with([
    '/rules',
    '/faq',
    '/status',
    '/terms',
    '/privacy',
    '/dmca',
    '/contact',
    '/search',
    '/janitors',
    '/report',
    '/contribute',
]);

it('serves information pages to signed-out visitors', function (): void {
    $this->assertGuest();

    $this->get('/terms')->assertOk();
    $this->get('/rules')->assertOk();
});
