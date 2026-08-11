<?php

declare(strict_types=1);

namespace App\Services\FourChan;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Sleep;

/**
 * 4chan's read-only JSON API.
 *
 * Two of its documented conditions are enforced here rather than left to
 * callers, because a caller that forgets one gets the whole application
 * rate-limited and there is no way to tell from the response that it happened:
 *
 * 1. At most one request a second. The gap is measured across every instance
 *    of this class through the cache, so a queued job and a console command
 *    running at once still add up to one request a second rather than two.
 * 2. `If-Modified-Since` on every request, carrying the `Last-Modified` of the
 *    previous response for that same endpoint. The answer to a request that
 *    sends it is usually `304`, which is the point: it costs upstream nothing
 *    and it tells the sync there is nothing to write.
 *
 * Nothing here writes upstream. The API accepts GET, HEAD and OPTIONS only.
 */
final class Client
{
    private const THROTTLE_KEY = 'clover.four-chan.last-request';

    private const LAST_MODIFIED_PREFIX = 'clover.four-chan.last-modified.';

    /**
     * How long a remembered `Last-Modified` is worth keeping.
     *
     * Long, because forgetting one is not a correctness problem — the next
     * request simply comes back `200` with a body we already had — but it is a
     * bandwidth problem, and upstream is the one paying for it.
     */
    private const LAST_MODIFIED_TTL_DAYS = 30;

    public function boards(): ApiResult
    {
        return $this->get('/boards.json');
    }

    public function catalog(string $slug): ApiResult
    {
        return $this->get("/{$slug}/catalog.json");
    }

    public function thread(string $slug, int $no): ApiResult
    {
        return $this->get("/{$slug}/thread/{$no}.json");
    }

    private function get(string $path): ApiResult
    {
        $this->throttle();

        try {
            $response = Http::baseUrl($this->baseUrl())
                ->timeout($this->timeout())
                ->withHeaders($this->conditionalHeaders($path))
                ->get($path);
        } catch (ConnectionException $e) {
            throw UpstreamException::unreachable($path, $e);
        }

        return $this->interpret($path, $response);
    }

    private function interpret(string $path, Response $response): ApiResult
    {
        if ($response->status() === 304) {
            return ApiResult::unchanged();
        }

        /**
         * A board that has been deleted upstream — 4chan retires them — answers
         * 404 forever. That is an answer, so the sync skips the board and keeps
         * the rows it already has rather than treating the whole run as failed.
         */
        if ($response->status() === 404) {
            return ApiResult::missing();
        }

        if (! $response->successful()) {
            throw UpstreamException::unexpectedStatus($path, $response->status());
        }

        $data = $response->json();

        if (! is_array($data)) {
            throw UpstreamException::malformed($path);
        }

        $lastModified = $response->header('Last-Modified');

        if ($lastModified !== '') {
            $this->rememberLastModified($path, $lastModified);
        }

        return ApiResult::fetched($data, $lastModified === '' ? null : $lastModified);
    }

    /**
     * Wait out the remainder of the second since the last request, whoever
     * made it. Recorded before the request rather than after, so a slow
     * response does not buy the next caller a free extra request.
     */
    private function throttle(): void
    {
        $last = Cache::get(self::THROTTLE_KEY);

        if (is_numeric($last)) {
            $wait = $this->rateLimitSeconds() - (microtime(true) - (float) $last);

            if ($wait > 0) {
                Sleep::for($wait)->seconds();
            }
        }

        Cache::put(self::THROTTLE_KEY, microtime(true), now()->addMinutes(5));
    }

    /**
     * @return array<string, string>
     */
    private function conditionalHeaders(string $path): array
    {
        $lastModified = Cache::get(self::LAST_MODIFIED_PREFIX.$path);

        return is_string($lastModified) && $lastModified !== ''
            ? ['If-Modified-Since' => $lastModified]
            : [];
    }

    private function rememberLastModified(string $path, string $lastModified): void
    {
        Cache::put(
            self::LAST_MODIFIED_PREFIX.$path,
            $lastModified,
            now()->addDays(self::LAST_MODIFIED_TTL_DAYS),
        );
    }

    private function baseUrl(): string
    {
        /** @var string $baseUrl */
        $baseUrl = config('clover.api.base_url', 'https://a.4cdn.org');

        return rtrim($baseUrl, '/');
    }

    private function timeout(): int
    {
        return (int) config('clover.api.timeout', 10);
    }

    private function rateLimitSeconds(): float
    {
        return (float) config('clover.api.rate_limit_seconds', 1);
    }
}
