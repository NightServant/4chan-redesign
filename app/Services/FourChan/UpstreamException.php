<?php

declare(strict_types=1);

namespace App\Services\FourChan;

use RuntimeException;
use Throwable;

/**
 * Upstream could not be read, so we do not know what it holds.
 *
 * Thrown for a network failure, an unexpected status, or a body that is not
 * JSON. Never thrown for a `304` or a `404`: both of those are answers, and
 * the sync acts on them. This is for the case where there is no answer, which
 * is the one case where writing anything would be guesswork.
 */
final class UpstreamException extends RuntimeException
{
    public static function unreachable(string $path, Throwable $previous): self
    {
        return new self("Could not reach 4chan for [{$path}]: {$previous->getMessage()}", previous: $previous);
    }

    public static function unexpectedStatus(string $path, int $status): self
    {
        return new self("4chan answered [{$path}] with HTTP {$status}.");
    }

    public static function malformed(string $path): self
    {
        return new self("4chan's response for [{$path}] was not JSON.");
    }
}
