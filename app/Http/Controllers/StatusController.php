<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\RelativeTime;
use App\Models\Board;
use App\Models\Post;
use App\Models\Thread;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * What Clover currently holds, and when it last heard from 4chan.
 *
 * The sidebar footer has linked to `/status` since task 4. The route was
 * removed in 13b along with five other pages that described things this
 * application does not have, which left the link resolving to a 404 — the one
 * genuinely dead link in the chrome.
 *
 * It is back because, unlike a janitor queue or a DMCA process, a status page
 * describes something Clover really does: it mirrors another site on a
 * schedule, and how fresh that mirror is is a fact worth publishing. Every
 * figure here is counted from the database at request time. Nothing is
 * estimated and nothing is cached.
 */
class StatusController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $showsMature = $this->showsMatureBoards($request);

        $lastSync = self::lastSyncedAt();

        return Inertia::render('status', [
            /**
             * Counted within this anon's own visibility, not globally. A
             * signed-out visitor being told the site holds eleven thousand
             * threads while the directory shows them rather fewer is a page
             * disagreeing with itself.
             */
            'boards' => Board::query()->visible($showsMature)->count(),
            'threads' => Thread::query()->onVisibleBoard($showsMature)->count(),
            'posts' => Post::query()
                ->whereIn(
                    'thread_id',
                    Thread::query()->onVisibleBoard($showsMature)->select('id'),
                )
                ->count(),

            /**
             * Whether the three figures above are the whole database.
             *
             * They are counted within this anon's visibility, and the page
             * introduced them as "the rows it currently holds" regardless --
             * so a signed-out reader comparing them against a sync run saw two
             * thirds of the threads under a sentence claiming to describe all
             * of them. The same defect the feed rail carried.
             */
            'complete' => $showsMature,

            /** Null before the first sync, which is a real state on a fresh clone. */
            'lastSyncedAt' => $lastSync === null
                ? null
                : RelativeTime::since($lastSync),

            'apiBaseUrl' => (string) config('clover.api.base_url'),
            'rateLimitSeconds' => (int) config('clover.api.rate_limit_seconds'),
        ]);
    }

    /**
     * When any board was last synced, as a date rather than a string.
     *
     * Read through the model so Eloquent's cast applies. `max('synced_at')`
     * returns whatever the driver hands back, which is a raw string, and
     * `RelativeTime::since()` type-hints `?DateTimeInterface` — so the
     * aggregate form type-errored on every request that had a board to
     * report. It only survived the test suite because those cases had no
     * boards at all and took the null branch.
     */
    private static function lastSyncedAt(): ?\DateTimeInterface
    {
        return Board::query()->latest('synced_at')->first()?->synced_at;
    }
}
