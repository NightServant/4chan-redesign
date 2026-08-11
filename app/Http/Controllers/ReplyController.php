<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\Thread;
use App\Services\LocalPostNumbers;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;

/**
 * Replying to a thread.
 *
 * The reply is stored here and never sent anywhere: 4chan's API accepts GET,
 * HEAD and OPTIONS only, so nothing an anon writes on Clover reaches the board
 * it is reading. That is the arrangement, not a limitation to be worked around
 * — the composer says as much and this controller is what finally makes it
 * true rather than a comment.
 *
 * A local reply sits in the same table as everything ingested, so it nests
 * into the same tree, quotes the same way, and is read by the same code.
 */
class ReplyController extends Controller
{
    public function store(Request $request, string $board, string $thread): RedirectResponse
    {
        $model = $this->visibleBoard($request, $board);

        $target = Thread::query()
            ->where('board_id', $model->id)
            ->where('no', (int) $thread)
            ->firstOrFail();

        $validated = $request->validate([
            /**
             * The board's own limit, not a global one. `max_comment_chars` is
             * really 2000, 3000 or 5000 depending on where you are posting, so
             * validating against a constant would reject two thirds of the
             * site's legitimate posts or accept posts a third of it forbids.
             */
            'body' => ['required', 'string', 'max:'.$model->max_comment_chars],

            /** Post numbers this reply answers, rendered as `>>` references. */
            'quotes' => ['array'],
            'quotes.*' => ['integer'],
        ]);

        $user = $request->user();

        /**
         * Only numbers that exist on this thread survive. A quote pointing at
         * a post that is not here renders as a reference to nothing, and the
         * reply tree would try to nest under a parent it cannot find.
         */
        $quotes = array_values(array_intersect(
            array_map('intval', $validated['quotes'] ?? []),
            $target->posts()->pluck('no')->map('intval')->all(),
        ));

        DB::transaction(function () use ($target, $model, $user, $validated, $quotes): void {
            Post::query()->create([
                'thread_id' => $target->id,
                'user_id' => $user->id,
                'no' => LocalPostNumbers::next($model),
                'is_op' => false,
                'is_local' => true,

                /**
                 * `Anonymous`, like everything else on the board. The account
                 * wrote it and the account can find it again; the post carries
                 * no name, because that is the product's entire claim.
                 *
                 * The tripcode is the one exception, and only because an anon
                 * opted into it.
                 */
                'author' => 'Anonymous',
                'tripcode' => $user->tripcode,

                'capcode' => null,
                'body' => trim($validated['body']),
                'quotes' => $quotes,
                'posted_at' => Date::now(),
            ]);

            /**
             * A reply bumps its thread, which is the ordering the whole
             * product runs on. Without this a local reply is invisible to
             * every surface that sorts by bump time — which is all of them.
             */
            $target->forceFill([
                'bumped_at' => Date::now(),
                'replies_count' => $target->replies_count + 1,
            ])->save();
        });

        return back();
    }
}
