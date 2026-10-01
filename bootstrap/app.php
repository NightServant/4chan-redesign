<?php

use App\Http\Middleware\AddSecurityHeaders;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\ThrottleFortifyRoutes;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        /**
         * Vercel (and any other load balancer) terminates TLS in front of the
         * app, so every request arrives over plain HTTP with the original
         * scheme in `X-Forwarded-Proto`. Without this, `url()` and Inertia's
         * asset links generate `http://`, and a secure cookie never gets set.
         * The balancer's address is not known ahead of time, so all proxies
         * are trusted rather than a fixed list.
         */
        $middleware->trustProxies(at: '*');

        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->web(append: [
            /**
             * In the group rather than on the routes, because the routes it
             * throttles belong to Fortify and are registered inside the
             * package with no limiter and no config key to give them one. It
             * matches on route name and steps aside for everything else.
             */
            ThrottleFortifyRoutes::class,

            AddSecurityHeaders::class,
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
