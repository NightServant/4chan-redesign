<?php

declare(strict_types=1);

namespace App\Services\FourChan;

/**
 * One upstream response, reduced to the three outcomes a caller acts on.
 *
 * Deliberately not a wrapper around Laravel's `Response`: the sync only ever
 * needs to know whether it has new data, whether the endpoint is unchanged, or
 * whether the thing is gone. Anything else — a network failure, a 500, a body
 * that is not JSON — is thrown as an `UpstreamException`, because those mean
 * "we do not know what upstream holds", which is never a reason to write.
 */
final class ApiResult
{
    /**
     * @param  array<array-key, mixed>  $data
     */
    private function __construct(
        public readonly ApiStatus $status,
        public readonly array $data = [],
        public readonly ?string $lastModified = null,
    ) {}

    /**
     * @param  array<array-key, mixed>  $data
     */
    public static function fetched(array $data, ?string $lastModified = null): self
    {
        return new self(ApiStatus::Fetched, $data, $lastModified);
    }

    public static function unchanged(): self
    {
        return new self(ApiStatus::Unchanged);
    }

    public static function missing(): self
    {
        return new self(ApiStatus::Missing);
    }

    public function isFetched(): bool
    {
        return $this->status === ApiStatus::Fetched;
    }

    public function isUnchanged(): bool
    {
        return $this->status === ApiStatus::Unchanged;
    }

    public function isMissing(): bool
    {
        return $this->status === ApiStatus::Missing;
    }
}
