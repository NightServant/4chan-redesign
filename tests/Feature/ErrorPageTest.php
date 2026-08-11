<?php

declare(strict_types=1);

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Route;
use Inertia\Testing\AssertableInertia;

/**
 * HTTP errors render Clover's own screen rather than Laravel's.
 *
 * A 404 here is usually a mistyped board slug, not a crash, so the error page
 * keeps the app chrome: an anon who lands on one can carry on from the sidebar
 * instead of reaching for the back button. That is also why these assertions
 * check the shared props survive — an error response is raised outside the
 * Inertia middleware, so without `withSharedData()` the chrome would render
 * with no auth state and no sidebar.
 */
it('renders the Clover error page for a URL that matches nothing', function (): void {
    $this->get('/notaboard')
        ->assertNotFound()
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->component('error')
                ->where('status', 404),
        );
});

it('keeps the status code on the response, not only in the props', function (): void {
    $this->get('/notaboard')->assertStatus(404);
});

it('carries the shared props the app chrome needs', function (): void {
    $this->get('/notaboard')
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->component('error')
                ->has('auth')
                ->has('sidebarOpen'),
        );
});

it('renders the error page for a forbidden response', function (): void {
    Route::get('test-forbidden', function (): void {
        throw new AuthorizationException;
    })->middleware('web');

    $this->get('test-forbidden')
        ->assertForbidden()
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->component('error')
                ->where('status', 403),
        );
});

/**
 * The one deliberate hole in the handler. With debug on, a 500 already renders
 * a stack trace that explains the failure; replacing it with a styled apology
 * costs a developer twenty minutes on a bug the framework had already
 * described. This pins that the exception is intentional rather than a gap
 * somebody should later "fix".
 */
it('leaves a server error to Laravel while debug is on', function (): void {
    config()->set('app.debug', true);

    Route::get('test-explodes', function (): void {
        throw new RuntimeException('boom');
    })->middleware('web');

    $response = $this->withExceptionHandling()->get('test-explodes');

    $response->assertStatus(500);

    expect($response->getContent())
        ->not->toContain('"component":"error"')
        ->toContain('boom');
});
