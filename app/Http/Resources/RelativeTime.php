<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Carbon\CarbonInterface;
use DateTimeInterface;
use Illuminate\Support\Facades\Date;

/**
 * Timestamps as Clover writes them: `4 min ago`, `1 hr ago`, `Yesterday`.
 *
 * Formatted here rather than on the client because every other counted or
 * formatted value on these props is formatted server-side, and splitting the
 * convention would leave the client guessing a locale for half the fields.
 *
 * Carbon's own `diffForHumans()` is close but says `4 minutes ago` at full
 * length and `4m ago` in short mode. Neither is the voice the screens were
 * designed in, and the design's voice is copy: rule 1 says copy is not
 * invented, so it is reproduced rather than approximated. The ladder below is
 * the one the fixtures used, and `RelativeTimeTest` pins each rung of it.
 */
final class RelativeTime
{
    /** Below this, nothing useful is gained by counting seconds. */
    private const JUST_NOW_SECONDS = 60;

    /** Past this many days a relative figure stops meaning anything. */
    private const RELATIVE_DAYS = 7;

    /** Matches `Profile.joined`, the one absolute date already in the design. */
    private const ABSOLUTE_FORMAT = 'j M Y';

    public static function since(?DateTimeInterface $moment, ?DateTimeInterface $now = null): string
    {
        if ($moment === null) {
            return 'just now';
        }

        $moment = Date::instance($moment);
        $now = $now === null ? Date::now() : Date::instance($now);

        /**
         * A timestamp in the future is upstream clock skew, not a countdown.
         * Clamping keeps it out of the negative branches rather than
         * rendering `-3 min ago` at the top of the feed.
         */
        if ($moment->greaterThan($now)) {
            $moment = $now;
        }

        $seconds = (int) $now->diffInSeconds($moment, absolute: true);

        if ($seconds < self::JUST_NOW_SECONDS) {
            return 'just now';
        }

        $minutes = intdiv($seconds, 60);

        if ($minutes < 60) {
            return "{$minutes} min ago";
        }

        $hours = intdiv($minutes, 60);

        if ($hours < 24) {
            return "{$hours} hr ago";
        }

        return self::inDays($moment, $now);
    }

    /**
     * Typed to the interface rather than to `Illuminate\Support\Carbon`, which
     * is what `Date::instance()` returns only while the default date class is
     * the mutable one. The models cast their timestamps to `CarbonImmutable`,
     * so a concrete hint here type-errors on every thread older than a day —
     * the exact rows that reach this branch and no others, which is why it
     * survived the resource's own tests.
     */
    private static function inDays(CarbonInterface $moment, CarbonInterface $now): string
    {
        /**
         * Calendar days, not elapsed ones: an anon reading "Yesterday" means
         * the day before today, and 30 hours ago can be either.
         */
        $days = (int) $moment->copy()->startOfDay()->diffInDays($now->copy()->startOfDay(), absolute: true);

        if ($days <= 1) {
            return 'Yesterday';
        }

        if ($days < self::RELATIVE_DAYS) {
            return "{$days} days ago";
        }

        return $moment->format(self::ABSOLUTE_FORMAT);
    }
}
