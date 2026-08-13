<?php

declare(strict_types=1);

namespace App\Http\Controllers;

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

    private const ACTIVITY = 6;

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
            'media' => $this->media($user, $showsMature),
            'saved' => ThreadResource::collection($this->saved($request, $showsMature)),
            'started' => ThreadResource::collection($this->started($request, $showsMature)),
            'activity' => $this->activity($user, $showsMature),
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
        $posts = $user->posts()->where('is_op', true)->count();
        $replies = $user->posts()->where('is_op', false)->count();

        return [
            ['label' => 'Posts', 'value' => number_format($posts)],
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
     * Their own uploads, which on a local post is nothing yet — Clover accepts
     * no files, so this is empty until it does. Empty rather than borrowed:
     * filling it with attachments from threads they merely read would claim
     * they posted them.
     *
     * @return array<int, string>
     */
    private function media(User $user, bool $showsMature): array
    {
        return $this->ownPosts($user, $showsMature)
            ->whereNotNull('media_tim')
            ->orderByDesc('posted_at')
            ->limit(self::MEDIA)
            ->get()
            ->map(fn (Post $post): ?string => $post->mediaLabel())
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
     * Threads this anon started here.
     *
     * @return Collection<int, Thread>
     */
    private function started(Request $request, bool $showsMature): Collection
    {
        return Thread::query()
            ->onVisibleBoard($showsMature)
            ->whereIn(
                'id',
                Post::query()
                    ->where('user_id', $request->user()->id)
                    ->where('is_op', true)
                    ->select('thread_id'),
            )
            ->with(['board', 'originalPost', 'bookmarks'])
            ->orderByDesc('bumped_at')
            ->limit(self::SAVED)
            ->get();
    }

    /**
     * What this anon has been doing, derived rather than announced.
     *
     * The fixture mixed things done *to* them with things they did — "Anonymous
     * replied to your post", "Your report was actioned". Neither has a source:
     * there is no reporting system, and a reply is not addressed to an account.
     * What is real is their own record, so that is what this shows.
     *
     * @return array<int, array<string, string>>
     */
    private function activity(User $user, bool $showsMature): array
    {
        $replies = $this->ownPosts($user, $showsMature)
            ->orderByDesc('posted_at')
            ->limit(self::ACTIVITY)
            ->get()
            ->map(fn (Post $post): array => [
                'icon' => 'message-square',
                'text' => $post->is_op
                    ? "You started a thread in {$post->thread->board->displaySlug()}"
                    : "You replied in {$post->thread->board->displaySlug()}",
                'time' => RelativeTime::since($post->posted_at),
                'at' => $post->posted_at->getTimestamp(),
            ]);

        $saves = $user->bookmarks()
            ->with('thread.board')
            ->orderByDesc('created_at')
            ->limit(self::ACTIVITY)
            ->get()
            ->map(fn ($bookmark): array => [
                'icon' => 'bookmark',
                'text' => "You saved a thread in {$bookmark->thread->board->displaySlug()}",
                'time' => RelativeTime::since($bookmark->created_at),
                'at' => $bookmark->created_at?->getTimestamp() ?? 0,
            ]);

        return $replies->concat($saves)
            ->sortByDesc('at')
            ->take(self::ACTIVITY)
            /* `at` is the sort key, not part of the contract. */
            ->map(fn (array $entry): array => Arr::except($entry, 'at'))
            ->values()
            ->all();
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
