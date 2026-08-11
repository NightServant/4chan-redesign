<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\Board;
use Illuminate\Support\Facades\Cache;
use Throwable;

/**
 * The board slugs `/{board}` is allowed to resolve.
 *
 * `/{board}` has the same shape as every named page on the site, so without a
 * constraint the router resolves `/rules` as a board and shadows the real
 * page. The constraint is this list.
 *
 * It is read while routes are being registered, which is the awkward part:
 * that happens on every request, and also in situations where the `boards`
 * table does not exist yet — a fresh clone running `migrate`, or a test
 * booting before its migrations. So the query is cached, and any failure to
 * reach the database falls back to the configured slugs rather than throwing.
 * A site that cannot reach its database should fail at the page, with a real
 * error, not at route registration with a stack trace about a missing table.
 */
final class RoutableBoards
{
    public const CACHE_KEY = 'clover.routable-boards';

    /**
     * @return array<int, string>
     */
    public static function slugs(): array
    {
        try {
            /** @var array<int, string> $cached */
            $cached = Cache::rememberForever(
                self::CACHE_KEY,
                static fn (): array => Board::query()->orderBy('slug')->pluck('slug')->all(),
            );
        } catch (Throwable) {
            /**
             * The cache store is the database too, so reaching it is itself a
             * query. An earlier version guarded only the `boards` lookup and
             * left `Cache::rememberForever` outside the guard, which meant the
             * fallback could not fire in the one situation it exists for: a
             * fresh clone with no SQLite file, where `package:discover` boots
             * the app before `migrate` has run and the failure is the cache
             * table, not `boards`.
             *
             * It looked correct and did nothing. Both the cache read and the
             * query have to be inside the guard.
             */
            return self::fallback();
        }

        return $cached === [] ? self::fallback() : $cached;
    }

    /**
     * The regular-expression alternation the route constraint uses.
     *
     * Slugs are quoted because three of them are numeric and none are trusted
     * to be regex-safe just because they happen to be today.
     */
    public static function pattern(): string
    {
        return implode('|', array_map(
            static fn (string $slug): string => preg_quote($slug, '/'),
            self::slugs(),
        ));
    }

    /**
     * Drop the cached list, so the next request rebuilds it from the table.
     * Called by the sync command once boards have changed.
     */
    public static function forget(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    /**
     * @return array<int, string>
     */
    private static function fallback(): array
    {
        /** @var array<int, string> $slugs */
        $slugs = config('clover.fallback_boards', []);

        return $slugs;
    }
}
