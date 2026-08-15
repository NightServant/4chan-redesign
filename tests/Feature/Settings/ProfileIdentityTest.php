<?php

use App\Models\User;

/**
 * The two fields the account screen puts on the page.
 *
 * They were displayed by the profile and writable by nothing: the screen showed
 * a handle at the top and a line underneath, and "Edit profile" led to a
 * settings form that edited neither. This endpoint is what the dialog on that
 * screen submits to.
 */
test('an anon can set the name their profile shows', function () {
    $user = User::factory()->create(['handle' => null, 'bio' => '']);

    $this->actingAs($user)
        ->patch(route('profile-identity.update'), [
            'handle' => 'gabe_c',
            'bio' => 'Reads /g/ at 3am.',
        ])
        ->assertSessionHasNoErrors();

    $user->refresh();

    expect($user->handle)->toBe('gabe_c');
    expect($user->bio)->toBe('Reads /g/ at 3am.');
    expect($user->displayHandle())->toBe('gabe_c');
});

/**
 * A cleared handle has to reach the database as null, not as an empty string.
 * Empty strings are not null, so the second anon to clear theirs would collide
 * with the first on the unique index.
 */
test('clearing the handle returns the anon to the fallback rather than colliding', function () {
    $first = User::factory()->create(['handle' => 'taken']);
    $second = User::factory()->create(['handle' => 'also_taken']);

    $this->actingAs($first)
        ->patch(route('profile-identity.update'), ['handle' => '', 'bio' => ''])
        ->assertSessionHasNoErrors();

    $this->actingAs($second)
        ->patch(route('profile-identity.update'), ['handle' => '', 'bio' => ''])
        ->assertSessionHasNoErrors();

    expect($first->refresh()->handle)->toBeNull();
    expect($second->refresh()->handle)->toBeNull();
    expect($first->displayHandle())->toBe("anon_{$first->id}");
});

test('a handle another anon already holds is rejected', function () {
    User::factory()->create(['handle' => 'taken']);
    $user = User::factory()->create(['handle' => 'mine']);

    $this->actingAs($user)
        ->patch(route('profile-identity.update'), ['handle' => 'taken', 'bio' => ''])
        ->assertSessionHasErrors('handle');

    expect($user->refresh()->handle)->toBe('mine');
});

test('an anon may keep their own handle', function () {
    $user = User::factory()->create(['handle' => 'mine']);

    $this->actingAs($user)
        ->patch(route('profile-identity.update'), ['handle' => 'mine', 'bio' => 'Hello.'])
        ->assertSessionHasNoErrors();

    expect($user->refresh()->bio)->toBe('Hello.');
});

/**
 * Word characters only, so a handle cannot be padded with spaces or built from
 * lookalikes to read as another anon's.
 */
test('a handle is rejected when it is not word characters', function (string $handle) {
    $user = User::factory()->create(['handle' => 'mine']);

    $this->actingAs($user)
        ->patch(route('profile-identity.update'), ['handle' => $handle, 'bio' => ''])
        ->assertSessionHasErrors('handle');

    expect($user->refresh()->handle)->toBe('mine');
})->with([
    'spaces' => 'two words',
    'punctuation' => 'gabe!',
    'too short' => 'ab',
    'too long' => 'a_very_long_handle_that_runs_past_the_limit',
]);

test('a bio past the limit is rejected', function () {
    $user = User::factory()->create(['bio' => 'Short.']);

    $this->actingAs($user)
        ->patch(route('profile-identity.update'), [
            'handle' => null,
            'bio' => str_repeat('a', 281),
        ])
        ->assertSessionHasErrors('bio');

    expect($user->refresh()->bio)->toBe('Short.');
});

test('the endpoint is closed to anyone not signed in', function () {
    $this->patch(route('profile-identity.update'), ['handle' => 'anon', 'bio' => ''])
        ->assertRedirect(route('login'));
});

/**
 * The public heading used to fall through the account's `name` before reaching
 * the `anon_{id}` fallback, which put whatever an anon typed at registration on
 * their profile. People type their real name there.
 *
 * The column is gone now, so there is nothing left to fall through to — which
 * is the strongest version of the fix. The guard stays because the fallback is
 * still the thing under test.
 */
test('an anon with no handle is named only by their id', function () {
    $user = User::factory()->create(['handle' => null]);

    expect($user->displayHandle())->toBe("anon_{$user->id}");
});
