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
 * Starting a thread.
 *
 * The other half of local posting. Stage one gave replies somewhere to go and
 * left the New Thread dialog writing to nothing, which made the button a
 * promise the application did not keep.
 *
 * Like a reply, the thread stays here: 4chan's API is read-only, so nothing an
 * anon starts on Clover appears on the board it was started from.
 */
class ThreadCreationController extends Controller
{
    /** A subject is optional upstream on most boards, and optional here. */
    private const SUBJECT_MAX = 120;

    public function store(Request $request, string $board): RedirectResponse
    {
        $model = $this->visibleBoard($request, $board);

        $validated = $request->validate([
            'subject' => ['nullable', 'string', 'max:'.self::SUBJECT_MAX],
            'body' => ['required', 'string', 'max:'.$model->max_comment_chars],
        ]);

        $user = $request->user();
        $now = Date::now();

        $thread = DB::transaction(function () use ($model, $user, $validated, $now): Thread {
            $number = LocalPostNumbers::next($model);

            $thread = Thread::query()->create([
                'board_id' => $model->id,
                'no' => $number,
                'subject' => filled($validated['subject'] ?? null)
                    ? trim((string) $validated['subject'])
                    : null,
                'sticky' => false,
                'closed' => false,
                'replies_count' => 0,
                'images_count' => 0,
                'posted_at' => $now,
                'bumped_at' => $now,

                /**
                 * A local thread is complete the moment it exists: there is no
                 * upstream page to fetch, and leaving this null would mark it
                 * as a catalog stub whose replies are still missing.
                 */
                'posts_synced_at' => $now,
            ]);

            /**
             * The opening post shares the thread's number, which is how an
             * imageboard works — a thread *is* its first post, and `>>` on the
             * thread number is a reference to it.
             */
            Post::query()->create([
                'thread_id' => $thread->id,
                'user_id' => $user->id,
                'no' => $number,
                'is_op' => true,
                'is_local' => true,
                'author' => 'Anonymous',
                'tripcode' => $user->tripcode,
                'capcode' => null,
                'body' => trim($validated['body']),
                'quotes' => [],
                'posted_at' => $now,
            ]);

            return $thread;
        });

        return to_route('thread', ['board' => $model->slug, 'thread' => $thread->no]);
    }
}
