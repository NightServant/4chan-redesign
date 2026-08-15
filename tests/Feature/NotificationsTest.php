<?php

use App\Models\Board;
use App\Models\Bookmark;
use App\Models\Post;
use App\Models\Thread;
use App\Models\ThreadRead;
use App\Models\User;
use App\Support\ThreadNotifications;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Date;
use Inertia\Testing\AssertableInertia as Assert;

/**
 * New replies in threads an anon is in.
 *
 * The screen this replaces said "Replies and janitor actions appear here",
 * naming two things this application does not have. What it reports instead is
 * derived entirely from local rows, and these tests are what hold the
 * derivation to the one thing that makes it worth showing: it must count what
 * arrived *after the anon last looked*, and never their own writing.
 */
function threadOn(Board $board, array $attributes = []): Thread
{
    return Thread::factory()->for($board)->create($attributes);
}

/**
 * A bookmark saved at a particular moment.
 *
 * `created_at` is not fillable, and it is the watermark for a saved thread, so
 * `Bookmark::create([... 'created_at' => ...])` silently stamps *now* and
 * every test built on it reports nothing new. Written once, here, rather than
 * rediscovered per test.
 */
function savedAt(User $user, Thread $thread, CarbonInterface $when): Bookmark
{
    $bookmark = Bookmark::create([
        'user_id' => $user->id,
        'thread_id' => $thread->id,
    ]);

    $bookmark->forceFill(['created_at' => $when, 'updated_at' => $when])->save();

    return $bookmark;
}

test('a thread an anon saved reports replies that arrived since', function () {
    $user = User::factory()->create();
    $board = Board::factory()->create(['slug' => 'g', 'worksafe' => true]);
    $thread = threadOn($board);

    savedAt($user, $thread, Date::now()->subDay());

    Post::factory()->for($thread)->count(3)->create([
        'user_id' => null,
        'posted_at' => Date::now()->subHour(),
    ]);

    $notifications = ThreadNotifications::for($user, false);

    expect($notifications)->toHaveCount(1);
    expect($notifications[0]['replies'])->toBe(3);
    expect($notifications[0]['reason'])->toBe('saved');
    expect($notifications[0]['board'])->toBe('/g/');
});

/**
 * The watermark is the whole feature. Without it every followed thread reports
 * its entire history as new, forever, and the badge becomes decoration.
 */
test('posts that predate the anon are not news to them', function () {
    $user = User::factory()->create();
    $board = Board::factory()->create(['slug' => 'g', 'worksafe' => true]);
    $thread = threadOn($board);

    Post::factory()->for($thread)->count(5)->create([
        'user_id' => null,
        'posted_at' => Date::now()->subWeek(),
    ]);

    savedAt($user, $thread, Date::now()->subDay());

    expect(ThreadNotifications::for($user, false))->toBe([]);
});

test('reading a thread clears what had arrived in it', function () {
    $user = User::factory()->create();
    $board = Board::factory()->create(['slug' => 'g', 'worksafe' => true]);
    $thread = threadOn($board);

    savedAt($user, $thread, Date::now()->subWeek());

    Post::factory()->for($thread)->count(2)->create([
        'user_id' => null,
        'posted_at' => Date::now()->subDay(),
    ]);

    expect(ThreadNotifications::for($user, false))->toHaveCount(1);

    ThreadRead::create([
        'user_id' => $user->id,
        'thread_id' => $thread->id,
        'progress' => 0,
        'last_read_at' => Date::now()->subHour(),
    ]);

    expect(ThreadNotifications::for($user, false))->toBe([]);
});

/**
 * Being told about your own writing is the same defect as an unread badge that
 * is always on.
 *
 * Reaching this takes some setting up, and the setup is the point. An anon's
 * own post normally *is* the watermark for the thread it is in, so their
 * writing lands before the line and the exclusion never fires. It fires when
 * `FOLLOWED` truncates: the watermark query reads only the 40 most recent own
 * posts, so a reply in a quiet saved thread falls off the end, the watermark
 * falls back to when the thread was saved, and that reply is suddenly "after"
 * it.
 *
 * The first draft of this test asserted the exclusion without reaching it —
 * it passed with the clause deleted. This one goes red.
 */
test('an anon is never notified about their own posts', function () {
    $user = User::factory()->create();
    $board = Board::factory()->create(['slug' => 'g', 'worksafe' => true]);
    $quiet = threadOn($board);

    savedAt($user, $quiet, Date::now()->subMonth());

    /* Their reply in the saved thread, after they saved it. */
    Post::factory()->for($quiet)->create([
        'user_id' => $user->id,
        'posted_at' => Date::now()->subWeeks(2),
    ]);

    /* Forty more recent posts elsewhere, which push the one above out of the
       window the watermark query reads. */
    Post::factory()
        ->for(threadOn($board))
        ->count(40)
        ->create([
            'user_id' => $user->id,
            'posted_at' => Date::now()->subDay(),
        ]);

    $notifications = collect(ThreadNotifications::for($user, false))
        ->firstWhere('threadId', $quiet->id);

    expect($notifications)->toBeNull();
});

test('posting in a thread follows it, and later replies are reported', function () {
    $user = User::factory()->create();
    $board = Board::factory()->create(['slug' => 'g', 'worksafe' => true]);
    $thread = threadOn($board);

    Post::factory()->for($thread)->create([
        'user_id' => $user->id,
        'posted_at' => Date::now()->subDay(),
    ]);

    Post::factory()->for($thread)->count(4)->create([
        'user_id' => null,
        'posted_at' => Date::now()->subHour(),
    ]);

    $notifications = ThreadNotifications::for($user, false);

    expect($notifications)->toHaveCount(1);
    expect($notifications[0]['replies'])->toBe(4);
    expect($notifications[0]['reason'])->toBe('posted');
});

/**
 * Opting out of a board has to hold everywhere, including in the furniture.
 * A notification naming a thread an anon asked not to see would defeat the
 * setting by describing what it hid.
 */
test('threads on hidden boards are never notified about', function () {
    $user = User::factory()->create();
    $board = Board::factory()->create(['slug' => 'b', 'worksafe' => false]);
    $thread = threadOn($board);

    savedAt($user, $thread, Date::now()->subDay());

    Post::factory()->for($thread)->count(2)->create([
        'user_id' => null,
        'posted_at' => Date::now()->subHour(),
    ]);

    expect(ThreadNotifications::for($user, false))->toBe([]);
    expect(ThreadNotifications::for($user, true))->toHaveCount(1);
});

test('a thread an anon merely read does not follow them around', function () {
    $user = User::factory()->create();
    $board = Board::factory()->create(['slug' => 'g', 'worksafe' => true]);
    $thread = threadOn($board);

    ThreadRead::create([
        'user_id' => $user->id,
        'thread_id' => $thread->id,
        'progress' => 0,
        'last_read_at' => Date::now()->subDay(),
    ]);

    Post::factory()->for($thread)->count(3)->create([
        'user_id' => null,
        'posted_at' => Date::now()->subHour(),
    ]);

    expect(ThreadNotifications::for($user, false))->toBe([]);
});

test('a signed-out visitor has none', function () {
    expect(ThreadNotifications::for(null, false))->toBe([]);
});

test('the page renders what the derivation returns', function () {
    $user = User::factory()->create();
    $board = Board::factory()->create(['slug' => 'g', 'worksafe' => true]);
    $thread = threadOn($board);

    savedAt($user, $thread, Date::now()->subDay());

    Post::factory()->for($thread)->create([
        'user_id' => null,
        'posted_at' => Date::now()->subHour(),
    ]);

    $this->actingAs($user)
        ->get(route('notifications'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('notifications')
            ->has('notifications', 1)
            ->where('notifications.0.replies', 1),
        );
});

/** It was `Route::inertia(... 'placeholder')` until this task. */
test('notifications is a real screen rather than a placeholder', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('notifications'))
        ->assertInertia(fn (Assert $page) => $page->component('notifications'));
});

test('notifications needs an account', function () {
    $this->get(route('notifications'))->assertRedirect(route('login'));
});
