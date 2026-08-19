<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Three standing statements every web response here makes about itself.
 *
 * `nosniff` is the one that earns its place rather than being received wisdom.
 * Clover holds exactly one class of file — images attached to replies written
 * here — and serves them off the `public` disk from the same origin as the
 * application. `ReplyController` checks the bytes as well as the extension, so
 * a `.png` that is really a zip is already refused; `nosniff` is what stops a
 * browser from second-guessing the `Content-Type` on whatever does get stored
 * and deciding it is a script after all.
 *
 * `SAMEORIGIN` because nothing here is meant to be embedded elsewhere, and a
 * framed Clover is a clickjacked one. `strict-origin-when-cross-origin` is what
 * modern browsers already default to; stating it means the default holds on the
 * ones that do not, and a thread URL — which names a board and a subject — is
 * not sent whole to 4chan's CDN when an image loads.
 *
 * There is deliberately no Content-Security-Policy here. The Blade shell runs
 * an inline script to set the theme before first paint, so a policy worth
 * having would need a per-request nonce threaded through that template, and a
 * policy with `unsafe-inline` in it would be a header that looks like a defence
 * and is not. That is a change to the shell, which is its own piece of work.
 */
final class AddSecurityHeaders
{
    /**
     * Header to value. Only set when the response does not already say
     * something — a controller that has deliberately loosened one of these for
     * a particular response should win over a blanket default.
     *
     * @var array<string, string>
     */
    private const HEADERS = [
        'X-Content-Type-Options' => 'nosniff',
        'X-Frame-Options' => 'SAMEORIGIN',
        'Referrer-Policy' => 'strict-origin-when-cross-origin',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        foreach (self::HEADERS as $header => $value) {
            if (! $response->headers->has($header)) {
                $response->headers->set($header, $value);
            }
        }

        return $response;
    }
}
