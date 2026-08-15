<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\AttachmentResource;
use App\Http\Resources\RelativeTime;
use App\Http\Resources\ThreadResource;
use App\Models\Post;
use App\Models\Thread;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The signed-in anon's own account screen.
 *
 * Everything here is counted from what this anon has actually done. Two panels
 * did not survive that:
 *
 * **Achievements** are gone. "Bumped 100 threads" and "10K blessings received"
 * were fixture badges every account displayed identically, and computing them
 * honestly would show an empty panel on any real account for a very long time.
 * A badge for something nothing measures is the same defect as an online count
 * with no source.
 *
 * **Janitor scope** is gone with them. It named a moderation system that does
 * not exist — there is no report queue, no janitor role and nothing to be in
 * scope of.
 */
class AccountController extends Controller
{
    private const COMMENTS = 20;

    private const MEDIA = 12;

    private const SAVED = 6;

    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $showsMature = $this->showsMatureBoards($request);

        return Inertia::render('account', [
            'profile' => [
                'handle' => $user->displayHandle(),
                /* What is stored, for the edit dialog to seed its field from.
                   Seeding it with `displayHandle()` would put the `anon_41`
                   fallback in the box, and an anon who opened the dialog to fix
                   their bio would save that as a real handle on the way out. */
                'storedHandle' => $user->handle,
                'tripcode' => $user->tripcode,
                'bio' => $user->bio,
                'joined' => $user->created_at?->format('j M Y') ?? '',
            ],
            'stats' => $this->stats($user),
            'comments' => $this->comments($user, $showsMature),
            'media' => $this->media($user, $showsMature, $request),
            'saved' => ThreadResource::collection($this->saved($request, $showsMature)),
        ]);
    }

    /**
     * The three figures on the profile header, all real.
     *
     * There were four. "Reputation" was blessings received on this anon's own
     * posts, net of curses, and it went when blessings did — there is no other
     * reading of the word this application has data for, and inventing one
     * from post counts would be a score dressed up as a measurement.
     *
     * @return array<int, array<string, string>>
     */
    private function stats(User $user): array
    {
        /**
         * Uploads, not threads started.
         *
         * The first figure counted `is_op` posts, which is always zero and
         * always will be: Clover accepts no new threads, so nobody has started
         * one. A figure that can only ever read 0 is not a measurement, and it
         * sat at the top of every profile saying nothing.
         *
         * What an anon does have is what they have attached to their replies,
         * which is the same set the Media tab lists.
         */
        $uploads = $user->posts()->whereNotNull('media_path')->count();
        $replies = $user->posts()->where('is_op', false)->count();

        return [
            ['label' => 'Media', 'value' => number_format($uploads)],
            ['label' => 'Comments', 'value' => number_format($replies)],
            ['label' => 'Bookmarks', 'value' => number_format($user->bookmarks()->count())],
        ];
    }

    /**
     * Replies this anon wrote, newest first.
     *
     * @return array<int, array<string, mixed>>
     */
    private function comments(User $user, bool $showsMature): array
    {
        return $this->ownPosts($user, $showsMature)
            ->where('is_op', false)
            ->orderByDesc('posted_at')
            ->limit(self::COMMENTS)
            ->get()
            ->map(fn (Post $post): array => [
                'no' => $post->no,
                'board' => $post->thread->board->displaySlug(),
                'threadNo' => $post->thread->no,
                'time' => RelativeTime::since($post->posted_at),
                'body' => $post->body,

                /**
                 * The opening line of whatever this reply answered, kept apart
                 * from the body so the screen can render it in the quote
                 * colour without parsing the body for a leading chevron.
                 * Absent when the reply quoted nothing, or when what it quoted
                 * is no longer here.
                 */
                'quoted' => $this->quotedLine($post),
            ])
            ->all();
    }

    /**
     * The first line of the post this reply was answering.
     */
    private function quotedLine(Post $post): ?string
    {
        $first = Arr::first($post->quotes);

        if ($first === null) {
            return null;
        }

        $quoted = Post::query()
            ->where('thread_id', $post->thread_id)
            ->where('no', (int) $first)
            ->first();

        $line = trim(Str::before((string) $quoted?->body, "\n"));

        return $line === '' ? null : Str::limit($line, 120);
    }

    /**
     * Attachments on this anon's own posts.
     *
     * Their own uploads, and only theirs. Empty rather than borrowed: filling
     * it with attachments from threads they merely read would claim they
     * posted them.
     *
     * This used to filter on `media_tim`, which is 4chan's id for a file on
     * 4chan's CDN — a column no post written here will ever have. So the tab
     * was empty by construction, and stayed empty the moment replies could
     * carry an image. `media_path` is what a local upload sets.
     *
     * It also used to send a list of *label strings* — "x230.png · 640x480 ·
     * 12 KB" — which the screen rendered as grey placeholders. The tab could
     * only ever show a caption describing a picture, never the picture, and it
     * was built that way back when there were no uploads to show. It sends the
     * attachment now, the same shape every other surface renders.
     *
     * @return array<int, array<string, mixed>>
     */
    private function media(User $user, bool $showsMature, Request $request): array
    {
        return $this->ownPosts($user, $showsMature)
            ->where(fn (Builder $query) => $query
                ->whereNotNull('media_path')
                ->orWhereNotNull('media_tim'))
            ->with('thread.board')
            ->orderByDesc('posted_at')
            ->limit(self::MEDIA)
            ->get()
            ->map(fn (Post $post): ?array => AttachmentResource::for($post, $request))
            ->filter()
            ->values()
            ->all();
    }

    /**
     * Threads this anon saved.
     *
     * @return Collection<int, Thread>
     */
    private function saved(Request $request, bool $showsMature): Collection
    {
        return Thread::query()
            ->onVisibleBoard($showsMature)
            ->whereIn('id', $request->user()->bookmarks()->select('thread_id'))
            ->with(['board', 'originalPost', 'bookmarks'])
            ->orderByDesc('bumped_at')
            ->limit(self::SAVED)
            ->get();
    }

    /**
     * Posts this anon wrote, on boards they may see.
     *
     * The visibility filter matters even on an anon's own writing: opting out
     * of a board should hide what they themselves posted there, or the setting
     * is only half honoured.
     *
     * @return Builder<Post>
     */
    private function ownPosts(User $user, bool $showsMature): Builder
    {
        return Post::query()
            ->where('user_id', $user->id)
            ->whereIn('thread_id', Thread::query()->onVisibleBoard($showsMature)->select('id'))
            ->with('thread.board');
    }
}
