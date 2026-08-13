<?php

declare(strict_types=1);

use App\Models\Board;
use App\Models\Bookmark;
use App\Models\Post;
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
            ->where('stats.2.label', 'Bookmarks')
            ->where('stats.2.value', '1'),
    );
});

/**
 * "Reputation" was the fourth figure, and it counted blessings. It went with
 * them rather than being redefined against post counts, which would have been
 * a score presented as a measurement.
 */
it('reports three stats and no reputation', function (): void {
    [, , , $user] = anonWithHistory();

    $this->actingAs($user)->get('/account')->assertInertia(
        fn ($page) => $page
            ->has('stats', 3)
            ->where('stats.0.label', 'Posts')
            ->where('stats.1.label', 'Comments')
            ->where('stats.2.label', 'Bookmarks'),
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
 * A card used to carry a score and a per-viewer vote state. Both are gone from
 * the payload, not merely unrendered: a client still receiving them would be a
 * client that could put the control back without the server noticing.
 */
it('sends no vote fields on a thread card', function (): void {
    [$board, , , $user] = anonWithHistory();

    $this->actingAs($user)->get("/{$board->slug}")->assertInertia(
        fn ($page) => $page
            ->missing('threads.0.blessings')
            ->missing('threads.0.voteState'),
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

/**
 * Seeded rather than posted. This drove the thread-creation route, which is
 * gone: Clover accepts no uploads, and a board where every new thread opens
 * without an image is not the board it is mirroring.
 *
 * What the screen does with a thread an anon started is still worth asserting,
 * and there are still local threads in the database from before the composer
 * was removed, so the row is built directly.
 */
it('shows a thread this anon started under their own posts', function (): void {
    [$board, , , $user] = anonWithHistory();

    $mine = Thread::factory()->for($board)->create(['subject' => 'A thread I started']);

    Post::factory()->for($mine)->op()->create([
        'user_id' => $user->id,
        'is_local' => true,
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

/**
 * The two settings that moved into the account menu behind the avatar.
 *
 * Both were a page visit away from a preference they affect everywhere:
 * showing adult boards changes what every screen lists, and two-factor is the
 * one security control that is not a form field.
 */
it('changes the adult-board preference from the header control', function (): void {
    $user = User::factory()->create(['shows_mature_boards' => false]);

    $this->actingAs($user)
        ->patch('/settings/board-preference', ['shows_mature_boards' => true])
        ->assertRedirect();

    expect($user->fresh()->shows_mature_boards)->toBeTrue();
});

/** The appearance page held one control the header carries on every screen. */
it('no longer serves an appearance settings page', function (): void {
    $user = User::factory()->create();

    $this->actingAs($user)->get('/settings/appearance')->assertNotFound();
});

/**
 * Reachable, not necessarily rendered: security sits behind a password
 * confirmation, so a fresh session is redirected to confirm rather than shown
 * the page. What matters here is that the route the menu links to still
 * exists, which a 404 would disprove and a 302 does not.
 */
it('still routes to the security page the menu links to', function (): void {
    $user = User::factory()->create(['email_verified_at' => now()]);

    $this->actingAs($user)->get('/settings/security')->assertStatus(302);
});
