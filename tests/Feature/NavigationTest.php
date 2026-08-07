<?php

declare(strict_types=1);

use App\Models\User;

/**
 * The Clover sidebar lists nine destinations. Seven have no real screen yet,
 * so they resolve to a placeholder rather than a 404: a dead nav item reads as
 * a bug during development, and a 404 is indistinguishable from one. These
 * tests pin which are public and which require an account, so replacing a
 * placeholder with a real screen later cannot silently change its access.
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
    '/messages',
    '/notifications',
]);

it('serves personal destinations to a signed-in anon', function (string $uri): void {
    $this->actingAs(User::factory()->create())->get($uri)->assertOk();
})->with([
    '/account',
    '/bookmarks',
    '/history',
    '/messages',
    '/notifications',
]);
