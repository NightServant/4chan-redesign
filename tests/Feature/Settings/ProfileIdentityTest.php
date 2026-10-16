<?php

use App\Actions\Fortify\CreateNewUser;
use App\Models\User;

/**
 * The bio, the line under the handle on the account screen. The handle above it
 * is assigned when the account is created and nothing can change it: a chosen
 * handle was the one thing on an account that could name the anon behind it.
 */
test('an anon can set the line their profile shows', function () {
    $user = User::factory()->create(['bio' => '']);

    $this->actingAs($user)
        ->patch(route('profile-identity.update'), ['bio' => 'Reads /g/ at 3am.'])
        ->assertSessionHasNoErrors();

    expect($user->refresh()->bio)->toBe('Reads /g/ at 3am.');
});

/**
 * Every handle the endpoint used to accept or reject is now simply ignored:
 * a chosen one, a blank one, another anon's, and the malformed ones.
 */
test('a handle sent to the endpoint changes nothing', function (string $handle) {
    User::factory()->create(['handle' => 'taken']);
    $user = User::factory()->create(['handle' => 'anon_k3f9x2qa']);

    $this->actingAs($user)
        ->patch(route('profile-identity.update'), ['handle' => $handle, 'bio' => 'Hello.'])
        ->assertSessionHasNoErrors();

    expect($user->refresh()->handle)->toBe('anon_k3f9x2qa')
        ->and($user->bio)->toBe('Hello.');
})->with([
    'chosen' => 'gabe_c',
    'blank' => '',
    'another anon\'s' => 'taken',
    'spaces' => 'two words',
    'punctuation' => 'gabe!',
    'too long' => 'a_very_long_handle_that_runs_past_the_limit',
]);

test('a bio past the limit is rejected', function () {
    $user = User::factory()->create(['bio' => 'Short.']);

    $this->actingAs($user)
        ->patch(route('profile-identity.update'), ['bio' => str_repeat('a', 281)])
        ->assertSessionHasErrors('bio');

    expect($user->refresh()->bio)->toBe('Short.');
});

test('the endpoint is closed to anyone not signed in', function () {
    $this->patch(route('profile-identity.update'), ['handle' => 'anon', 'bio' => ''])
        ->assertRedirect(route('login'));
});

/**
 * Generated, not derived from the id: `anon_{id}` would publish how many
 * accounts exist and in what order they joined.
 */
test('every account is given a generated handle', function () {
    $user = (new CreateNewUser)->create([
        'email' => 'anon@example.com',
        'password' => 'correct-horse-battery-staple',
        'password_confirmation' => 'correct-horse-battery-staple',
    ]);
    $other = User::factory()->create();

    expect($user->handle)->toMatch('/^anon_[a-z0-9]{8}$/')
        ->not->toBe("anon_{$user->id}")
        ->and($other->handle)->toMatch('/^anon_[a-z0-9]{8}$/')
        ->not->toBe($user->handle);
});

test('a handle cannot be mass-assigned', function () {
    $user = User::factory()->create(['handle' => 'anon_k3f9x2qa']);

    $user->fill(['handle' => 'gabe_c'])->save();

    expect($user->refresh()->handle)->toBe('anon_k3f9x2qa');
});

/** Accounts from before the change lose the handle they chose. */
test('the backfill replaces a chosen handle with a generated one', function () {
    $user = User::factory()->create(['handle' => 'gabe_c']);

    (require database_path('migrations/2026_10_16_025748_assign_generated_handles_to_users.php'))->up();

    expect($user->refresh()->handle)->toMatch('/^anon_[a-z0-9]{8}$/');
});
