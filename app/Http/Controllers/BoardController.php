<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\BoardResource;
use App\Http\Resources\ThreadResource;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * A single board, e.g. `/g/`.
 *
 * The slug arrives constrained to a routable board, which is a routing concern
 * and not an access one: the constraint is what stops `/rules` resolving as a
 * board, and it knows nothing about who is asking. Whether *this* anon may see
 * *this* board is decided here, by `visibleBoard()`, which 404s rather than
 * 403s so the board's existence is not confirmed to someone who has asked not
 * to see boards like it.
 */
class BoardController extends Controller
{
    /** One board page's worth. The page paginates below this. */
    private const THREADS = 40;

    public function __invoke(Request $request, string $board): Response
    {
        $model = $this->visibleBoard($request, $board);

        $threads = $model->threads()
            ->with(['board', 'originalPost'])
            ->orderByDesc('bumped_at')
            ->limit(self::THREADS)
            ->get();

        return Inertia::render('board', [
            'board' => (new BoardResource($model->loadCount('threads')))->withDescription(),
            'threads' => ThreadResource::collection($threads),

            /**
             * The board's own limit, not a global one. `boards.json` reports
             * `max_comment_chars` per board and it is really 2000, 3000 or
             * 5000 depending on where you are posting, so a composer that
             * imported one constant was telling two thirds of the site the
             * wrong number.
             */
            'maxCommentChars' => $model->max_comment_chars,
        ]);
    }
}
