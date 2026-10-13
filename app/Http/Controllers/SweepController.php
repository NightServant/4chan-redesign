<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use GuzzleHttp\Exception\ConnectException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * The sweep, triggered from outside.
 *
 * GitHub's scheduler dropped most of the half-hourly slots: 31 runs in a week
 * where 336 were asked for. A free external cron calls `start` instead, and
 * the sweep runs here in sin1, beside the database, rather than across the
 * Pacific. The secret is Clover's own and opens only these two routes.
 *
 * A sweep takes about 90 seconds and the cron stops waiting after 30, so
 * answering it with the sweep's own result would read as a timeout every run.
 * `start` therefore answers at once and hands the work to `run`, a second
 * request that it sends to itself and then stops waiting for. `run` is the
 * route that sweeps; nobody reads its status, so it is logged instead, and
 * Vercel's logs are where a failed sweep shows up.
 *
 * That hand-off leans on one thing about the platform: Vercel lets a request
 * finish after its caller has hung up. Observed on `vercel-php@0.8.0` in a
 * preview spike on 2026-10-12: a function sleeping 100 seconds, and another
 * 200, logged their last line after the caller left at 5. The same spike
 * showed the opposite for the usual tricks to answer early and keep working
 * in the same request (`defer()`, `Connection: close`): the instance is frozen
 * once the response is out. If the platform stops letting abandoned requests
 * finish, the hourly workflow in `.github/workflows/sync.yml` still sweeps.
 */
class SweepController extends Controller
{
    private const LOCK = 'clover.sweep';

    private const MINIMUM_TOKEN_LENGTH = 32;

    /**
     * Start a sweep and return before it ends.
     */
    public function start(Request $request): JsonResponse
    {
        $token = $this->authorise($request);

        /**
         * Pinned, never read from the request. The self-call carries the
         * bearer token, and the host, scheme and port of a request are
         * whatever its sender (or a proxy in front, all of which are trusted
         * here) says they are. Unset means the trigger cannot be sent safely,
         * so it is refused rather than guessed at.
         */
        $origin = rtrim((string) config('clover.sweep.origin'), '/');

        if ($origin === '') {
            Log::error('CLOVER_SWEEP_ORIGIN is not set, so a sweep cannot be started.');

            return response()->json(['started' => false], 503);
        }

        /**
         * A look, not a hold: the lock belongs to `run`. Asking costs one
         * cache round trip and spares a self-call that would only be refused.
         */
        $probe = Cache::lock(self::LOCK, 10);

        if (! $probe->get()) {
            return $this->running();
        }

        $probe->release();

        try {
            $response = Http::withToken($token)
                ->connectTimeout(5)
                ->timeout(10)
                ->post($origin.route('sweep.run', absolute: false));
        } catch (ConnectionException $e) {
            if ($this->waitedOnAStartedRun($e)) {
                return response()->json(['started' => true], 202);
            }

            Log::error('The sweep could not be started.', ['error' => $e->getMessage()]);

            return response()->json(['started' => false], 502);
        }

        if ($response->status() === 409) {
            return $this->running();
        }

        return $response->failed()
            ? response()->json(['started' => false], 502)
            : response()->json(['started' => true], 202);
    }

    /**
     * Sweep. Called by `start`, so nobody is waiting for the answer.
     */
    public function run(Request $request): JsonResponse
    {
        $this->authorise($request);

        $lock = Cache::lock(self::LOCK, 600);

        if (! $lock->get()) {
            return $this->running();
        }

        try {
            ignore_user_abort(true);
            set_time_limit(0);

            $exitCode = Artisan::call('clover:sync', ['--no-interaction' => true]);
        } finally {
            $lock->release();
        }

        if ($exitCode === 0) {
            Log::info('Sweep finished.', ['exit_code' => $exitCode]);
        } else {
            Log::error('Sweep failed.', ['exit_code' => $exitCode]);
        }

        return response()->json(['ok' => $exitCode === 0], $exitCode === 0 ? 200 : 500);
    }

    /**
     * The presented token, once it has been checked. Aborts with 401 when it
     * is missing or wrong, and always when the configured one is shorter than
     * thirty-two characters: unset, or pasted wrong, and either way not a
     * secret worth comparing against.
     */
    private function authorise(Request $request): string
    {
        $token = trim((string) config('clover.sweep.token'));

        if (strlen($token) < self::MINIMUM_TOKEN_LENGTH) {
            Log::error('CLOVER_SWEEP_TOKEN is unset or shorter than '.self::MINIMUM_TOKEN_LENGTH.' characters, so every sweep call is refused.');

            abort(401);
        }

        if (! hash_equals($token, (string) $request->bearerToken())) {
            abort(401);
        }

        return $token;
    }

    /**
     * Whether a failed self-call is the expected end of a started run.
     *
     * `run` holds the line for the length of a sweep and the trigger stops
     * waiting, which curl reports as a timeout (errno 28). But the timeout is
     * for the whole exchange, so one that fires during DNS, connect or TLS
     * looks the same and means the request was never sent. Only a timeout
     * after bytes went out (`request_size`) is a run that started.
     */
    private function waitedOnAStartedRun(ConnectionException $e): bool
    {
        $previous = $e->getPrevious();

        if (! $previous instanceof ConnectException) {
            return false;
        }

        $context = $previous->getHandlerContext();

        return ($context['errno'] ?? null) === 28 && (int) ($context['request_size'] ?? 0) > 0;
    }

    private function running(): JsonResponse
    {
        return response()->json(['running' => true], 409);
    }
}
