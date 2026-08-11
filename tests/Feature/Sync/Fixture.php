<?php

declare(strict_types=1);

namespace Tests\Feature\Sync;

use RuntimeException;

/**
 * Recorded 4chan responses.
 *
 * These were captured from the live API rather than written by hand, and
 * trimmed only by dropping boards, pages and posts — no field was removed,
 * renamed or simplified. Hand-written JSON is how an ingest passes its tests
 * and then meets `<wbr>` in the middle of a URL, a `sub` full of entities, or
 * a post with no `com` at all, none of which anyone thinks to invent.
 */
final class Fixture
{
    public static function raw(string $name): string
    {
        $path = dirname(__DIR__, 2)."/Fixtures/FourChan/{$name}";

        if (! is_file($path)) {
            throw new RuntimeException("Missing fixture [{$name}].");
        }

        return (string) file_get_contents($path);
    }

    /**
     * @return array<array-key, mixed>
     */
    public static function json(string $name): array
    {
        /** @var array<array-key, mixed> $decoded */
        $decoded = json_decode(self::raw($name), true, flags: JSON_THROW_ON_ERROR);

        return $decoded;
    }
}
