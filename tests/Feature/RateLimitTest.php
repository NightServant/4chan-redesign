<?php

declare(strict_types=1);

use App\Models\Board;
use App\Models\Post;
use App\Models\Thread;
use App\Models\User;
use App\Support\RoutableBoards;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Fortify\Features;

/**
 * What stops one client from hammering the expensive endpoints.
 *
 * Every limit here guards something that costs more to answer than to ask
 * for: a `LIKE '%...%'` across a hundred and fifty thousand posts, a four
 * megabyte upload, a whole comment tree, a bcrypt hash, an outbound email.
 * None of them had a ceiling, and the two that fire without a button being
 * pressed -- `search/suggest`, which runs on a keystroke -- had the least.
 *
 * The assertions are deliberately blunt: drive the endpoint past its limit and
 * expect 429. A test that asserted the exact number would be a second copy of
 * the limit, and would have to be edited every time the real one moved.
 */
beforeEach(function (): void {
    RoutableBoards::forget();
});

/** Hit a route until it stops answering, or give up and fail loudly. */
function hitUntilThrottled(Closure $send, int $ceiling = 120): int
{
    for ($attempt = 1; $attempt <= $ceiling; $attempt++) {
        if ($send()->getStatusCode() === 429) {
            return $attempt;
        }
    }

    return 0;
}

it('throttles the search page', function (): void {
    $attempts = hitUntilThrottled(fn () => $this->get('/search?q=risc'));

    expect($attempts)->toBeGreaterThan(0);
});

it('throttles the suggestions endpoint', function (): void {
    $attempts = hitUntilThrottled(fn () => $this->getJson('/search/suggest?q=risc'));

    expect($attempts)->toBeGreaterThan(0);
});

/**
 * Reading a thread's replies is public and returns the whole tree, so the
 * limit is per address rather than per account -- there is no account to key
 * it on.
 */
it('throttles the public replies feed', function (): void {
    $board = Board::factory()->slug('g')->create();
    $thread = Thread::factory()->for($board)->create();
    Post::factory()->for($thread)->op()->create();

    $attempts = hitUntilThrottled(fn () => $this->getJson("/g/{$thread->no}/replies"));

    expect($attempts)->toBeGreaterThan(0);
});

/**
 * Posting a reply accepts a four megabyte upload. The ceiling is far lower
 * than the reading ones for that reason: this one writes, and it writes to
 * disk.
 */
it('throttles posting replies', function (): void {
    Storage::fake('public');

    $board = Board::factory()->slug('g')->create(['max_comment_chars' => 2000]);
    $thread = Thread::factory()->for($board)->create();
    Post::factory()->for($thread)->op()->create();
    $user = User::factory()->create();

    $this->actingAs($user);

    $attempts = hitUntilThrottled(fn () => $this->post("/g/{$thread->no}/replies", [
        'body' => 'Mainline boots.',
        'media' => UploadedFile::fake()->image('x230.png', 64, 64),
    ]));

    expect($attempts)->toBeGreaterThan(0);
});

/**
 * Fortify registers `register`, `forgot-password` and `reset-password` inside
 * the package, and this version of it resolves a named limiter from config for
 * login, two-factor, passkeys and verification only -- these three get none.
 * Registration runs a bcrypt hash, the other two send mail to an address the
 * caller chose, so all three are worth someone else's money to run in a loop.
 */
it('throttles registration', function (): void {
    $this->skipUnlessFortifyHas(Features::registration());

    $attempts = hitUntilThrottled(fn () => $this->post(route('register.store'), [
        'name' => 'Test User',
        'email' => 'taken@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]));

    expect($attempts)->toBeGreaterThan(0);
});

it('throttles password reset link requests', function (): void {
    $this->skipUnlessFortifyHas(Features::resetPasswords());

    $attempts = hitUntilThrottled(fn () => $this->post(route('password.email'), [
        'email' => 'nobody@example.com',
    ]));

    expect($attempts)->toBeGreaterThan(0);
});

it('throttles password resets', function (): void {
    $this->skipUnlessFortifyHas(Features::resetPasswords());

    $attempts = hitUntilThrottled(fn () => $this->post(route('password.update'), [
        'token' => 'not-a-real-token',
        'email' => 'nobody@example.com',
        'password' => 'new-password',
        'password_confirmation' => 'new-password',
    ]));

    expect($attempts)->toBeGreaterThan(0);
});
