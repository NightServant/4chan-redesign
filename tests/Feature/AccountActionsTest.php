<?php

declare(strict_types=1);

use App\Models\Board;
use App\Models\Bookmark;
use App\Models\Post;
use App\Models\PostVote;
use App\Models\Thread;
use App\Models\ThreadRead;
use App\Models\User;
use App\Services\LocalPostNumbers;
use App\Support\RoutableBoards;

/**
 * What an account can do, as opposed to read.
 *
 * All of it is private to the anon doing it, and all of it is a toggle in the
 * interface — so all of it is idempotent here. A double submit is a double
 * press, not an error.
 *
 * The visibility rule runs through every one of these. Reading was gated in
 * task 11a; without the same gate on the write paths, a board an anon has
 * asked not to see stays reachable by id to anyone who guesses one.
 */
beforeEach(function (): void {
    RoutableBoards::forget();
});

function accountFixture(bool $worksafe = true): array
{
    $board = Board::factory()->slug('g')->state(['worksafe' => $worksafe])->create();
    $thread = Thread::factory()->for($board)->create();
    $post = Post::factory()->for($thread)->op()->create();

    return [$board, $thread, $post, User::factory()->create()];
}

describe('votes', function (): void {
    it('records a blessing', function (): void {
        [, , $post, $user] = accountFixture();

        $this->actingAs($user)->post("/posts/{$post->id}/vote", ['value' => 1]);

        expect($post->votes()->sum('value'))->toBe(1);
    });

    it('records a curse', function (): void {
        [, , $post, $user] = accountFixture();

        $this->actingAs($user)->post("/posts/{$post->id}/vote", ['value' => -1]);

        expect($post->votes()->sum('value'))->toBe(-1);
    });

    /**
     * The control reports `aria-pressed`, so pressing a blessing you have
     * already given has to withdraw it. Casting a second one would make the
     * button's own state a lie.
     */
    it('withdraws a vote when the same side is pressed again', function (): void {
        [, , $post, $user] = accountFixture();

        $this->actingAs($user)->post("/posts/{$post->id}/vote", ['value' => 1]);
        $this->actingAs($user)->post("/posts/{$post->id}/vote", ['value' => 1]);

        expect($post->votes()->count())->toBe(0);
    });

    it('switches sides rather than holding both', function (): void {
        [, , $post, $user] = accountFixture();

        $this->actingAs($user)->post("/posts/{$post->id}/vote", ['value' => 1]);
        $this->actingAs($user)->post("/posts/{$post->id}/vote", ['value' => -1]);

        expect($post->votes()->count())->toBe(1);
        expect($post->votes()->sum('value'))->toBe(-1);
    });

    it('counts one anon once, however many times they press', function (): void {
        [, , $post, $user] = accountFixture();

        foreach (range(1, 5) as $ignored) {
            $this->actingAs($user)->post("/posts/{$post->id}/vote", ['value' => 1]);
        }

        expect($post->votes()->count())->toBeLessThanOrEqual(1);
    });

    it('sums votes from different anons', function (): void {
        [, , $post] = accountFixture();

        foreach (User::factory()->count(3)->create() as $voter) {
            $this->actingAs($voter)->post("/posts/{$post->id}/vote", ['value' => 1]);
        }

        expect($post->votes()->sum('value'))->toBe(3);
    });

    it('refuses a value that is neither a blessing nor a curse', function (): void {
        [, , $post, $user] = accountFixture();

        $this->actingAs($user)
            ->post("/posts/{$post->id}/vote", ['value' => 7])
            ->assertSessionHasErrors('value');

        expect($post->votes()->count())->toBe(0);
    });

    it('turns a signed-out anon away', function (): void {
        [, , $post] = accountFixture();

        $this->post("/posts/{$post->id}/vote", ['value' => 1])->assertRedirect('/login');

        expect($post->votes()->count())->toBe(0);
    });

    it('will not let an anon vote on a board they cannot see', function (): void {
        [, , $post, $user] = accountFixture(worksafe: false);

        $this->actingAs($user)
            ->post("/posts/{$post->id}/vote", ['value' => 1])
            ->assertNotFound();

        expect($post->votes()->count())->toBe(0);
    });
});

describe('bookmarks', function (): void {
    it('saves a thread', function (): void {
        [, $thread, , $user] = accountFixture();

        $this->actingAs($user)->post("/threads/{$thread->id}/bookmark", ['note' => 'read later']);

        expect($user->bookmarks()->count())->toBe(1);
        expect($user->bookmarks()->first()->note)->toBe('read later');
    });

    it('saves without a note', function (): void {
        [, $thread, , $user] = accountFixture();

        $this->actingAs($user)->post("/threads/{$thread->id}/bookmark");

        expect($user->bookmarks()->first()->note)->toBe('');
    });

    it('updates the note rather than failing on a second save', function (): void {
        [, $thread, , $user] = accountFixture();

        $this->actingAs($user)->post("/threads/{$thread->id}/bookmark", ['note' => 'first']);
        $this->actingAs($user)->post("/threads/{$thread->id}/bookmark", ['note' => 'second']);

        expect($user->bookmarks()->count())->toBe(1);
        expect($user->bookmarks()->first()->note)->toBe('second');
    });

    it('removes a saved thread', function (): void {
        [, $thread, , $user] = accountFixture();

        Bookmark::factory()->create(['user_id' => $user->id, 'thread_id' => $thread->id]);

        $this->actingAs($user)->delete("/threads/{$thread->id}/bookmark");

        expect($user->bookmarks()->count())->toBe(0);
    });

    it('will not save a thread on a board the anon cannot see', function (): void {
        [, $thread, , $user] = accountFixture(worksafe: false);

        $this->actingAs($user)
            ->post("/threads/{$thread->id}/bookmark")
            ->assertNotFound();

        expect($user->bookmarks()->count())->toBe(0);
    });

    it('is private to the anon who saved it', function (): void {
        [, $thread, , $user] = accountFixture();
        $other = User::factory()->create();

        Bookmark::factory()->create(['user_id' => $user->id, 'thread_id' => $thread->id]);

        expect($other->bookmarks()->count())->toBe(0);
    });
});

describe('reading history', function (): void {
    it('records that a thread was read', function (): void {
        [, $thread, , $user] = accountFixture();

        $this->actingAs($user)->post("/threads/{$thread->id}/read", ['progress' => 40]);

        expect($user->reads()->count())->toBe(1);
        expect($user->reads()->first()->progress)->toBe(40);
    });

    /**
     * A history that appended every visit would list the same thread six times
     * in an afternoon, which is a log rather than a history.
     */
    it('replaces the entry on a second visit rather than appending', function (): void {
        [, $thread, , $user] = accountFixture();

        $this->actingAs($user)->post("/threads/{$thread->id}/read", ['progress' => 10]);
        $this->actingAs($user)->post("/threads/{$thread->id}/read", ['progress' => 80]);

        expect($user->reads()->count())->toBe(1);
        expect($user->reads()->first()->progress)->toBe(80);
    });

    /**
     * The client reports progress, so it is not trusted. The history screen
     * sorts by least finished, and one value of 400 would sit above everything
     * real for as long as it existed.
     */
    it('clamps progress the client reports', function (int $sent, int $stored): void {
        [, $thread, , $user] = accountFixture();

        $this->actingAs($user)->post("/threads/{$thread->id}/read", ['progress' => $sent]);

        expect($user->reads()->first()->progress)->toBe($stored);
    })->with([
        'over a hundred' => [400, 100],
        'negative' => [-20, 0],
        'in range' => [55, 55],
    ]);

    it('forgets the whole history when an anon asks', function (): void {
        [, , , $user] = accountFixture();

        ThreadRead::factory()->count(3)->create(['user_id' => $user->id]);

        $this->actingAs($user)->delete('/history');

        expect($user->reads()->count())->toBe(0);
    });

    it('leaves another anon history alone', function (): void {
        [, , , $user] = accountFixture();
        $other = User::factory()->create();

        ThreadRead::factory()->count(2)->create(['user_id' => $other->id]);

        $this->actingAs($user)->delete('/history');

        expect($other->reads()->count())->toBe(2);
    });
});

describe('board subscriptions', function (): void {
    it('follows a board', function (): void {
        [$board, , , $user] = accountFixture();

        $this->actingAs($user)->post("/boards/{$board->id}/subscribe");

        expect($user->subscribedBoards()->count())->toBe(1);
    });

    it('follows once however many times the button is pressed', function (): void {
        [$board, , , $user] = accountFixture();

        $this->actingAs($user)->post("/boards/{$board->id}/subscribe");
        $this->actingAs($user)->post("/boards/{$board->id}/subscribe");

        expect($user->subscribedBoards()->count())->toBe(1);
    });

    it('unfollows', function (): void {
        [$board, , , $user] = accountFixture();

        $user->subscribedBoards()->attach($board->id);

        $this->actingAs($user)->delete("/boards/{$board->id}/subscribe");

        expect($user->subscribedBoards()->count())->toBe(0);
    });

    /**
     * A subscription puts a board in the sidebar, which is the one place the
     * mature filter has to hold hardest.
     */
    it('will not follow a board the anon cannot see', function (): void {
        [$board, , , $user] = accountFixture(worksafe: false);

        $this->actingAs($user)
            ->post("/boards/{$board->id}/subscribe")
            ->assertNotFound();

        expect($user->subscribedBoards()->count())->toBe(0);
    });
});

describe('replying', function (): void {
    it('stores a reply on the thread', function (): void {
        [$board, $thread, , $user] = accountFixture();

        $this->actingAs($user)->post("/{$board->slug}/{$thread->no}/replies", [
            'body' => 'Eight cores, 16 GB. It is usable, not fast.',
        ]);

        expect($thread->posts()->where('is_local', true)->count())->toBe(1);
    });

    /**
     * The product's central claim. An account wrote it and can find it again;
     * the post carries no name.
     */
    it('posts anonymously, whoever wrote it', function (): void {
        [$board, $thread, , $user] = accountFixture();

        $this->actingAs($user)->post("/{$board->slug}/{$thread->no}/replies", [
            'body' => 'anon',
        ]);

        $reply = $thread->posts()->where('is_local', true)->first();

        expect($reply->author)->toBe('Anonymous');
        expect($reply->user_id)->toBe($user->id);
    });

    it('attaches the tripcode an anon opted into', function (): void {
        [$board, $thread, , $user] = accountFixture();

        $user->update(['tripcode' => '!!Xk29fLp2']);

        $this->actingAs($user)->post("/{$board->slug}/{$thread->no}/replies", ['body' => 'signed']);

        expect($thread->posts()->where('is_local', true)->first()->tripcode)
            ->toBe('!!Xk29fLp2');
    });

    /**
     * A number upstream will itself issue within the hour would collide on the
     * next sync, and the local post would silently displace a real one.
     */
    it('numbers a local post far above anything upstream has reached', function (): void {
        [$board, $thread, , $user] = accountFixture();

        $this->actingAs($user)->post("/{$board->slug}/{$thread->no}/replies", ['body' => 'x']);

        $reply = $thread->posts()->where('is_local', true)->first();

        expect($reply->no)->toBeGreaterThanOrEqual(LocalPostNumbers::BASE);
        expect(LocalPostNumbers::isLocal($reply->no))->toBeTrue();
    });

    it('gives consecutive replies distinct numbers', function (): void {
        [$board, $thread, , $user] = accountFixture();

        foreach (range(1, 3) as $n) {
            $this->actingAs($user)->post("/{$board->slug}/{$thread->no}/replies", ['body' => "reply {$n}"]);
        }

        $numbers = $thread->posts()->where('is_local', true)->pluck('no');

        expect($numbers)->toHaveCount(3);
        expect($numbers->unique())->toHaveCount(3);
    });

    /** Bump order is the ordering the whole product runs on. */
    it('bumps the thread and counts the reply', function (): void {
        [$board, $thread, , $user] = accountFixture();

        $before = $thread->bumped_at;
        $replies = $thread->replies_count;

        $this->travel(1)->minutes();

        $this->actingAs($user)->post("/{$board->slug}/{$thread->no}/replies", ['body' => 'x']);

        $thread->refresh();

        expect($thread->bumped_at->greaterThan($before))->toBeTrue();
        expect($thread->replies_count)->toBe($replies + 1);
    });

    it('refuses an empty reply', function (): void {
        [$board, $thread, , $user] = accountFixture();

        $this->actingAs($user)
            ->post("/{$board->slug}/{$thread->no}/replies", ['body' => ''])
            ->assertSessionHasErrors('body');

        expect($thread->posts()->where('is_local', true)->count())->toBe(0);
    });

    /**
     * `max_comment_chars` is per board — 2000, 3000 or 5000 — so validating
     * against a constant would reject legitimate posts on two thirds of the
     * site or accept ones a third of it forbids.
     */
    it('enforces the board own character limit', function (): void {
        [$board, $thread, , $user] = accountFixture();

        $board->update(['max_comment_chars' => 2000]);

        $this->actingAs($user)
            ->post("/{$board->slug}/{$thread->no}/replies", ['body' => str_repeat('a', 2001)])
            ->assertSessionHasErrors('body');

        $board->update(['max_comment_chars' => 5000]);

        $this->actingAs($user)
            ->post("/{$board->slug}/{$thread->no}/replies", ['body' => str_repeat('a', 2001)])
            ->assertSessionHasNoErrors();
    });

    /**
     * A quote pointing at a post that is not on this thread renders as a
     * reference to nothing, and the reply tree would try to nest under a
     * parent it cannot find.
     */
    it('keeps only quotes that exist on the thread', function (): void {
        [$board, $thread, $post, $user] = accountFixture();

        $this->actingAs($user)->post("/{$board->slug}/{$thread->no}/replies", [
            'body' => 'answering',
            'quotes' => [$post->no, 999_999_999],
        ]);

        expect($thread->posts()->where('is_local', true)->first()->quotes)
            ->toBe([$post->no]);
    });

    it('turns a signed-out anon away', function (): void {
        [$board, $thread] = accountFixture();

        $this->post("/{$board->slug}/{$thread->no}/replies", ['body' => 'x'])
            ->assertRedirect('/login');

        expect($thread->posts()->where('is_local', true)->count())->toBe(0);
    });

    it('will not reply on a board the anon cannot see', function (): void {
        [$board, $thread, , $user] = accountFixture(worksafe: false);

        $this->actingAs($user)
            ->post("/{$board->slug}/{$thread->no}/replies", ['body' => 'x'])
            ->assertNotFound();

        expect($thread->posts()->where('is_local', true)->count())->toBe(0);
    });
});

describe('vote counting', function (): void {
    it('reports net blessings, not a raw count', function (): void {
        [, , $post] = accountFixture();

        PostVote::factory()->count(4)->create(['post_id' => $post->id]);
        PostVote::factory()->create(['post_id' => $post->id, 'value' => PostVote::CURSE]);

        expect($post->blessings())->toBe(3);
    });

    it('reports how this anon voted', function (): void {
        [, , $post, $user] = accountFixture();

        expect($post->load('votes')->voteStateFor($user))->toBeNull();

        PostVote::factory()->create([
            'post_id' => $post->id,
            'user_id' => $user->id,
            'value' => PostVote::CURSE,
        ]);

        expect($post->load('votes')->voteStateFor($user))->toBe('cursed');
    });

    it('reports nothing for a signed-out anon', function (): void {
        [, , $post] = accountFixture();

        expect($post->load('votes')->voteStateFor(null))->toBeNull();
    });
});
