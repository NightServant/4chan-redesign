<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Symfony\Component\HttpFoundation\Response;

/**
 * The rate limits Fortify's own routes cannot be given any other way.
 *
 * Fortify registers `register`, `forgot-password` and `reset-password` inside
 * the package, and this version of `routes/routes.php` reads a named limiter
 * out of config for four of its routes only — `login`, `two-factor`,
 * `passkeys` and `verification`. The other three are registered with `guest`
 * and nothing else, so there is no config key to set and no route object of
 * ours to hang `throttle:` on.
 *
 * Hence a middleware. It goes in the `web` group, which is the group Fortify
 * puts its routes in (`config('fortify.middleware')`), and it looks at the
 * matched route's name: for the three that need a limiter it defers to
 * `ThrottleRequests` with a named one, and for everything else it steps out of
 * the way in an array lookup.
 *
 * Group middleware runs before a route's own, so this also fires ahead of
 * Fortify's `guest` — which matters, because `guest` short-circuits an already
 * authenticated caller and a throttle behind it would never count those.
 *
 * The limiters themselves are defined in `FortifyServiceProvider`, beside the
 * ones Fortify does resolve from config, so all of them are in one place.
 */
final class ThrottleFortifyRoutes extends ThrottleRequests
{
    /**
     * Route name to named limiter.
     *
     * Registration runs a bcrypt hash. The other two send mail to an address
     * the caller chose, which is somebody else's inbox and somebody else's
     * sending reputation.
     *
     * @var array<string, string>
     */
    private const LIMITERS = [
        'register.store' => 'register',
        'password.email' => 'password-reset',
        'password.update' => 'password-reset',
    ];

    /**
     * @param  int|string  $maxAttempts
     * @param  float|int  $decayMinutes
     * @param  string  $prefix
     */
    public function handle($request, Closure $next, $maxAttempts = 60, $decayMinutes = 1, $prefix = ''): Response
    {
        $limiter = self::LIMITERS[$request->route()?->getName()] ?? null;

        if ($limiter === null) {
            return $next($request);
        }

        /* Three arguments exactly: that is how `ThrottleRequests` recognises a
           named limiter rather than a bare attempt count. */
        return parent::handle($request, $next, $limiter);
    }
}
