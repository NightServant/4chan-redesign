<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Carbon\CarbonInterface;

/**
 * When this anon was last on a thread: `Today, 14:02`, `Yesterday, 09:15`, or
 * an absolute date for anything older, plus which of those three days it
 * belongs to.
 *
 * Extracted out of `HistoryController`, which used to be the only caller.
 * `AccountController` needs the exact same pair for the account screen's
 * History tab below `md` — the same day-grouped list, reading the same
 * `ThreadRead` rows — and a second implementation of "what day is this" is
 * exactly the class of duplication this codebase keeps finding and
 * rewriting away from on the client side; there is no reason the server
 * side should get a pass.
 */
final class ThreadReadTime
{
    public static function when(CarbonInterface $moment, CarbonInterface $now): string
    {
        return match (self::day($moment, $now)) {
            'Today' => 'Today, '.$moment->format('H:i'),
            'Yesterday' => 'Yesterday, '.$moment->format('H:i'),
            default => $moment->format('j M Y, H:i'),
        };
    }

    /**
     * Calendar days, not elapsed ones: an anon reading "Yesterday" means the
     * day before today, and thirty hours ago can be either.
     */
    public static function day(CarbonInterface $moment, CarbonInterface $now): string
    {
        $days = $moment->copy()->startOfDay()->diffInDays($now->copy()->startOfDay(), absolute: true);

        return match (true) {
            $days < 1 => 'Today',
            $days < 2 => 'Yesterday',
            default => 'Earlier',
        };
    }
}
