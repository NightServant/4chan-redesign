<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;

/**
 * Every component a route names must exist on disk.
 *
 * `Route::inertia('account', 'account')` answers 200 whether or not
 * `resources/js/pages/account.tsx` exists: the server hands the component name
 * to the client and never checks it resolves. A route pointing at a component
 * nobody wrote is therefore green in the suite, green in `route:list`, and a
 * blank screen in the browser.
 *
 * That is this project's recurring failure: markup and wiring that look right
 * and do nothing. It has cost six other bugs already, none of which a
 * component test could see. This one closes the routing case.
 */
it('has a page component on disk for every route that names one', function (): void {
    $missing = collect(Route::getRoutes())
        ->map(fn ($route): mixed => $route->defaults['component'] ?? null)
        ->filter()
        ->unique()
        ->reject(fn (string $component): bool => file_exists(
            resource_path("js/pages/{$component}.tsx"),
        ))
        ->values()
        ->all();

    expect($missing)->toBe(
        [],
        'these routes name a page component that does not exist, so they answer 200 and render nothing',
    );
});

/**
 * The error page is not reachable through the route table, so the test above
 * cannot see it. It is named in `AppServiceProvider::configureErrorPages()`,
 * which is the only other place a component name is written by hand.
 */
it('has the error page component the exception handler renders', function (): void {
    expect(resource_path('js/pages/error.tsx'))->toBeFile();
});
