<?php

declare(strict_types=1);

use App\Models\Board;
use App\Models\Bookmark;
use App\Models\Post;
use App\Models\PostVote;
use App\Models\Thread;
use App\Models\ThreadRead;
use App\Models\User;
use App\Support\RoutableBoards;

/**
 * The account screens, reading what the write paths recorded.
 *
 * Stage one built the tables and the routes and left the controls as the
 * no-ops they had always been: everything was tested and nothing was reachable.
 * These tests close that loop — they act as the interface now does and then
 * read the screens back, so a control wired to the wrong route fails here
 * rather than looking fine in a component test that never left the browser.
 */
beforeEach(function (): void {
    RoutableBoards::forget();
});

function anonWithHistory(): array
{
    $board = Board::factory()->slug('g')->create();
    $thread = Thread::factory()->for($board)->create(['subject' => 'A saved thread']);
    $op = Post::factory()->for($thread)->op()->create(['body' => 'The opening post.']);

    $user = User::factory()->create([
        'handle' => 'anon_4412',
        'bio' => 'Reads /g/ at 3am.',
    ]);

    return [$board, $thread, $op, $user];
}

it('shows the profile the account actually has', function (): void {
    [, , , $user] = anonWithHistory();

    $this->actingAs($user)->get('/account')->assertInertia(
        fn ($page) => $page
            ->component('account')
            ->where('profile.handle', 'anon_4412')
            ->where('profile.bio', 'Reads /g/ at 3am.'),
    );
});

/**
 * Achievements and janitor scope are gone. The badges were fixture claims
 * every account displayed identically, and janitor scope named a moderation
 * system that does not exist.
 */
it('sends no achievements and no janitor scope', function (): void {
    [, , , $user] = anonWithHistory();

    $this->actingAs($user)->get('/account')->assertInertia(
        fn ($page) => $page
            ->component('account')
            ->missing('achievements')
            ->missing('profile.janitorScope'),
    );
});

it('counts the anon own posts, replies and bookmarks', function (): void {
    [$board, $thread, , $user] = anonWithHistory();

    Post::factory()->for($thread)->create(['user_id' => $user->id, 'is_op' => false]);
    Bookmark::factory()->create(['user_id' => $user->id, 'thread_id' => $thread->id]);

    $this->actingAs($user)->get('/account')->assertInertia(
        fn ($page) => $page
            ->where('stats.1.label', 'Comments')
            ->where('stats.1.value', '1')
            ->where('stats.3.label', 'Bookmarks')
            ->where('stats.3.value', '1'),
    );
});

/** Blessings received on this anon's own posts, net of curses. */
it('counts reputation from votes on the anon own posts', function (): void {
    [, $thread, , $user] = anonWithHistory();

    $mine = Post::factory()->for($thread)->create(['user_id' => $user->id]);

    PostVote::factory()->count(3)->create(['post_id' => $mine->id]);
    PostVote::factory()->create(['post_id' => $mine->id, 'value' => PostVote::CURSE]);

    $this->actingAs($user)->get('/account')->assertInertia(
        fn ($page) => $page
            ->where('stats.2.label', 'Reputation')
            ->where('stats.2.value', '2'),
    );
});

it('lists a saved thread on the bookmarks screen', function (): void {
    [, $thread, , $user] = anonWithHistory();

    $this->actingAs($user)->post("/threads/{$thread->id}/bookmark", ['note' => 'read later']);

    $this->actingAs($user)->get('/bookmarks')->assertInertia(
        fn ($page) => $page
            ->component('bookmarks')
            ->has('bookmarks', 1)
            ->where('bookmarks.0.note', 'read later')
            ->where('bookmarks.0.thread.title', 'A saved thread'),
    );
});

it('stops listing a thread once the bookmark is removed', function (): void {
    [, $thread, , $user] = anonWithHistory();

    Bookmark::factory()->create(['user_id' => $user->id, 'thread_id' => $thread->id]);

    $this->actingAs($user)->delete("/threads/{$thread->id}/bookmark");

    $this->actingAs($user)->get('/bookmarks')->assertInertia(
        fn ($page) => $page->has('bookmarks', 0),
    );
});

it('lists a read thread on the history screen', function (): void {
    [, $thread, , $user] = anonWithHistory();

    $this->actingAs($user)->post("/threads/{$thread->id}/read", ['progress' => 40]);

    $this->actingAs($user)->get('/history')->assertInertia(
        fn ($page) => $page
            ->component('history')
            ->has('entries', 1)
            ->where('entries.0.progress', 40)
            ->where('entries.0.day', 'Today'),
    );
});

/**
 * The day is decided server-side. The screen used to parse the front of
 * `when` for the words `Today,` and `Yesterday,`, which worked only because a
 * fixture wrote them by hand.
 */
it('groups a thread read yesterday under Yesterday', function (): void {
    [, $thread, , $user] = anonWithHistory();

    ThreadRead::factory()->create([
        'user_id' => $user->id,
        'thread_id' => $thread->id,
        'last_read_at' => now()->subDay(),
    ]);

    $this->actingAs($user)->get('/history')->assertInertia(
        fn ($page) => $page->where('entries.0.day', 'Yesterday'),
    );
});

it('empties the history when the anon clears it', function (): void {
    [, $thread, , $user] = anonWithHistory();

    ThreadRead::factory()->create(['user_id' => $user->id, 'thread_id' => $thread->id]);

    $this->actingAs($user)->delete('/history');

    $this->actingAs($user)->get('/history')->assertInertia(
        fn ($page) => $page->has('entries', 0),
    );
});

/**
 * The vote a card and the thread page both write to, read back on the card.
 * Blessing a thread is blessing its opening post, recorded once.
 */
it('reports a blessing on the thread it was cast on', function (): void {
    [$board, $thread, , $user] = anonWithHistory();

    $this->actingAs($user)->post("/threads/{$thread->id}/vote", ['value' => 1]);

    $this->actingAs($user)->get("/{$board->slug}")->assertInertia(
        fn ($page) => $page
            ->where('threads.0.blessings', 1)
            ->where('threads.0.voteState', 'blessed'),
    );
});

it('reports nothing pressed for an anon who has not voted', function (): void {
    [$board] = anonWithHistory();

    $this->get("/{$board->slug}")->assertInertia(
        fn ($page) => $page
            ->where('threads.0.blessings', 0)
            ->where('threads.0.voteState', null),
    );
});

it('reports a saved thread as bookmarked on its card', function (): void {
    [$board, $thread, , $user] = anonWithHistory();

    Bookmark::factory()->create(['user_id' => $user->id, 'thread_id' => $thread->id]);

    $this->actingAs($user)->get("/{$board->slug}")->assertInertia(
        fn ($page) => $page->where('threads.0.bookmarked', true),
    );
});

it('reports a followed board as followed in the directory', function (): void {
    [$board, , , $user] = anonWithHistory();

    $this->actingAs($user)->post("/boards/{$board->id}/subscribe");

    $this->actingAs($user)->get('/communities')->assertInertia(
        fn ($page) => $page->where('boards.0.subscribed', true),
    );
});

/**
 * A reply written here appears in the thread it was written on, and on the
 * account that wrote it — without carrying that account's name onto the post.
 */
it('shows a local reply in the thread and on the account', function (): void {
    [$board, $thread, , $user] = anonWithHistory();

    $this->actingAs($user)->post("/{$board->slug}/{$thread->no}/replies", [
        'body' => 'Eight cores, 16 GB. Usable, not fast.',
    ]);

    $this->actingAs($user)->get("/{$board->slug}/{$thread->no}")->assertInertia(
        fn ($page) => $page
            ->component('thread')
            ->has('comments', 1)
            ->where('comments.0.body', 'Eight cores, 16 GB. Usable, not fast.')
            ->where('comments.0.author', 'Anonymous'),
    );

    $this->actingAs($user)->get('/account')->assertInertia(
        fn ($page) => $page
            ->has('comments', 1)
            ->where('comments.0.body', 'Eight cores, 16 GB. Usable, not fast.'),
    );
});

it('shows a thread this anon started under their own posts', function (): void {
    [$board, , , $user] = anonWithHistory();

    $this->actingAs($user)->post("/{$board->slug}/threads", [
        'subject' => 'A thread I started',
        'body' => 'The opening post.',
    ]);

    $this->actingAs($user)->get('/account')->assertInertia(
        fn ($page) => $page
            ->has('started', 1)
            ->where('started.0.title', 'A thread I started'),
    );
});

/**
 * Activity is what this anon did, not what was done to them. The fixture it
 * replaced announced "Anonymous replied to your post" and "Your report was
 * actioned", neither of which has a source.
 */
it('reports the anon own activity', function (): void {
    [$board, $thread, , $user] = anonWithHistory();

    $this->actingAs($user)->post("/{$board->slug}/{$thread->no}/replies", ['body' => 'x']);
    $this->actingAs($user)->post("/threads/{$thread->id}/bookmark");

    /* Both happened in the same second, so the order between them is a tie
       rather than a guarantee. What matters is that both are reported and
       both describe something this anon did. */
    $this->actingAs($user)->get('/account')->assertInertia(
        fn ($page) => $page
            ->has('activity', 2)
            ->where('activity.0.text', fn (string $text): bool => str_starts_with($text, 'You '))
            ->where('activity.1.text', fn (string $text): bool => str_starts_with($text, 'You ')),
    );
});

it('reports no activity for an anon who has done nothing', function (): void {
    [, , , $user] = anonWithHistory();

    $this->actingAs($user)->get('/account')->assertInertia(
        fn ($page) => $page->has('activity', 0),
    );
});
