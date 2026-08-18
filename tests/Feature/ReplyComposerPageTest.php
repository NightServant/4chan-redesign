<?php

declare(strict_types=1);

use App\Models\Board;
use App\Models\Post;
use App\Models\Thread;
use App\Models\User;
use App\Support\RoutableBoards;
use Inertia\Testing\AssertableInertia;

/**
 * The composer as its own page, for phones.
 *
 * A reply box at the foot of a thread works with a mouse and a full window. On
 * a phone it is a two-line textarea under two hundred comments, and the
 * keyboard takes half of what is left. Reddit's answer is a screen of its own,
 * and it is the right one here: the field gets the viewport, the attachment
 * control has somewhere to live, and Post is where a thumb can reach it.
 *
 * It writes through `ReplyController::store` — the same route, the same
 * validation, the same numbering. This page is a second surface onto that, not
 * a second implementation of it, which is the distinction the history page and
 * its account tab got wrong before task 4 undid it.
 */
beforeEach(function (): void {
    RoutableBoards::forget();
});

function composerTarget(): array
{
    $board = Board::factory()->slug('g')->create(['max_comment_chars' => 2000]);
    $thread = Thread::factory()->for($board)->create(['subject' => 'Init systems, again']);
    Post::factory()->for($thread)->op()->create();
    $user = User::factory()->create();

    return [$board, $thread, $user];
}

it('renders the composer page for a signed-in anon', function (): void {
    [, $thread, $user] = composerTarget();

    $this->actingAs($user)
        ->get("/g/{$thread->no}/reply")
        ->assertOk()
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->component('reply')
                ->where('thread.no', $thread->no)
                ->where('thread.title', 'Init systems, again')
                ->where('thread.board', '/g/')
                /* The board's own limit, not the shared fallback: the page
                   counts characters against what the server will actually
                   accept, and /g/ is 2000 while other boards are 3000 or
                   5000. A page counting against a constant would let an anon
                   fill a field the request then rejects. */
                ->where('maxCommentChars', 2000)
        );
});

/**
 * Writing needs an account, so the page that writes does too. It sits behind
 * the same `auth` middleware as the route it posts to -- a composer reachable
 * without one would collect a reply and then bounce the anon to a login form
 * with what they wrote gone.
 */
/**
 * A thread with no subject is ordinary on an imageboard, and this page names
 * the thread an anon is writing into -- so it has to say what a reader
 * recognises it by. `displayTitle` already knows: the subject, else the OP's
 * opening line, else the post number.
 *
 * This path was written out by hand here first, calling a method `Post` does
 * not have. phpstan caught it in CI; these tests did not, because every
 * fixture had a subject.
 */
it('names a subjectless thread by its opening line', function (): void {
    $board = Board::factory()->slug('g')->create(['max_comment_chars' => 2000]);
    $thread = Thread::factory()->for($board)->create(['subject' => null]);
    Post::factory()->for($thread)->op()->create([
        'body' => "Mainline boots but the GPU does nothing.\nSecond line, unused.",
    ]);
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get("/g/{$thread->no}/reply")
        ->assertOk()
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->where('thread.title', 'Mainline boots but the GPU does nothing.')
        );
});

it('sends a signed-out anon to sign in', function (): void {
    [, $thread] = composerTarget();

    $this->get("/g/{$thread->no}/reply")->assertRedirect('/login');
});

it('404s for a thread that is not on that board', function (): void {
    [, $thread, $user] = composerTarget();

    Board::factory()->slug('v')->create();

    $this->actingAs($user)
        ->get("/v/{$thread->no}/reply")
        ->assertNotFound();
});

/**
 * The page's own submit goes through the route that already existed, so a
 * reply written here is indistinguishable from one written inline -- same
 * numbering, same nesting, same table.
 */
it('posts through the existing reply route', function (): void {
    [, $thread, $user] = composerTarget();

    $this->actingAs($user)
        ->post("/g/{$thread->no}/replies", ['body' => 'Written from the composer page.'])
        ->assertRedirect();

    expect($thread->posts()->where('body', 'Written from the composer page.')->exists())
        ->toBeTrue();
});
