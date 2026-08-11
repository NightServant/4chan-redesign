<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\PostVote;
use App\Models\Thread;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Blessing and cursing a post.
 *
 * The vote is a toggle, which is what the interface already promises: the
 * control reports `aria-pressed`, so pressing a blessing you have already
 * given withdraws it rather than casting a second one.
 *
 * Blessing a thread card is blessing its opening post — the card and the
 * thread page offer the same act, and it is recorded once.
 */
class PostVoteController extends Controller
{
    /**
     * Voting on a thread, which means voting on its opening post.
     *
     * A card offers one blessing button and the thread page offers the same
     * one on the same post. Routing the card through the thread keeps the
     * client from having to know the OP's own id, and keeps both spellings
     * writing to the single row the count is read from.
     */
    public function storeForThread(Request $request, Thread $thread): RedirectResponse
    {
        $op = $thread->originalPost;

        abort_if($op === null, 404);

        return $this->store($request, $op);
    }

    public function store(Request $request, Post $post): RedirectResponse
    {
        $validated = $request->validate([
            'value' => ['required', 'integer', 'in:1,-1'],
        ]);

        /**
         * A post on a board this anon may not see is a post they may not vote
         * on. Without this the gate is only on reading, and a hidden board's
         * posts stay reachable by id to anyone who guesses one.
         */
        abort_unless(
            $post->thread->board->worksafe || $this->showsMatureBoards($request),
            404,
        );

        $user = $request->user();
        $value = (int) $validated['value'];

        $existing = PostVote::query()
            ->where('user_id', $user->id)
            ->where('post_id', $post->id)
            ->first();

        if ($existing === null) {
            PostVote::query()->create([
                'user_id' => $user->id,
                'post_id' => $post->id,
                'value' => $value,
            ]);

            return back();
        }

        /**
         * Pressing the same side again withdraws. Pressing the other side
         * switches, rather than leaving a curse and a blessing to argue: the
         * table holds one vote per anon per post and this is what keeps that
         * true without a second round trip.
         */
        if ($existing->value === $value) {
            $existing->delete();

            return back();
        }

        $existing->update(['value' => $value]);

        return back();
    }
}
