<?php

declare(strict_types=1);

use App\Models\User;

/**
 * The Clover sidebar lists nine destinations. All but `/notifications` now
 * have a real screen; that one still resolves to a placeholder rather than a
 * 404, because a dead nav item reads as a bug and a 404 is indistinguishable
 * from one.
 *
 * These tests pin which destinations are public and which require an account.
 * That mattered most while screens were being swapped in behind them: access
 * is a property of the route, not of whatever component it happens to render
 * this week, and replacing a placeholder must not quietly change it.
 */
it('serves the public browse destinations to signed-out visitors', function (string $uri): void {
    $this->get($uri)->assertOk();
})->with([
    '/',
    '/popular',
    '/latest',
    '/communities',
]);

it('redirects signed-out visitors away from personal destinations', function (string $uri): void {
    $this->get($uri)->assertRedirect('/login');
})->with([
    '/account',
    '/bookmarks',
    '/history',
    '/notifications',
]);

it('serves personal destinations to a signed-in anon', function (string $uri): void {
    $this->actingAs(User::factory()->create())->get($uri)->assertOk();
})->with([
    '/account',
    '/bookmarks',
    '/history',
    '/notifications',
]);
