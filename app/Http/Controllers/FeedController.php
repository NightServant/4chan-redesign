<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\ThreadResource;
use App\Models\Board;
use App\Models\Thread;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The feed, in three sorts.
 *
 * All three are public: reading needs no account, which is the product's
 * central claim and should not be contradicted by the routing.
 *
 * Which sort is showing is decided here and passed as a prop rather than read
 * back out of the URL by the page, so there is exactly one source of truth for
 * it. The route supplies it as a default; see `routes/web.php`.
 */
class FeedController extends Controller
{
    /** A screenful and a bit. The page paginates below this. */
    private const THREADS = 30;

    public function __invoke(Request $request, string $sort): Response
    {
        $showsMature = $this->showsMatureBoards($request);

        $threads = Thread::query()
            ->onVisibleBoard($showsMature)

            /**
             * Eager loaded because every card needs both. Thirty threads each
             * lazily loading a board and an OP is sixty extra queries for a
             * page that can be done in three.
             */
            ->with(['board', 'originalPost', 'bookmarks'])

            ->when($sort === 'bumped', fn ($query) => $query->orderByDesc('bumped_at'))

            /**
             * By replies, which is now the only activity signal there is.
             *
             * It was always the one doing the work. Blessings were Clover's
             * own and almost nothing carried any, so ranking by them sorted
             * eleven thousand ties and called the result popularity. Reply
             * count is what the board itself runs on and it is real for every
             * row.
             */
            ->when($sort === 'popular', fn ($query) => $query->orderByDesc('replies_count'))

            ->when($sort === 'latest', fn ($query) => $query->orderByDesc('posted_at'))
            ->limit(self::THREADS)
            ->get();

        return Inertia::render('feed', [
            'sort' => $sort,
            'threads' => ThreadResource::collection($threads),
        ]);
    }
}
