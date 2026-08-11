<?php

declare(strict_types=1);

use App\Models\User;

/**
 * Boards 4chan marks as not worksafe are hidden until an anon opts in.
 *
 * The default is the whole point: "has not decided" and "has said no" must
 * behave identically, so a fresh account and a signed-out visitor both get the
 * filtered view without anything having to ask which of the two they are.
 */
it('starts every new account with adult boards hidden', function (): void {
    expect(User::factory()->create()->shows_mature_boards)->toBeFalse();
});

it('lets a signed-in anon opt in', function (): void {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch('/settings/board-preference', ['shows_mature_boards' => true])
        ->assertRedirect();

    expect($user->refresh()->shows_mature_boards)->toBeTrue();
});

it('lets them opt back out', function (): void {
    $user = User::factory()->create(['shows_mature_boards' => true]);

    $this->actingAs($user)
        ->patch('/settings/board-preference', ['shows_mature_boards' => false]);

    expect($user->refresh()->shows_mature_boards)->toBeFalse();
});

it('rejects a value that is not a boolean', function (): void {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch('/settings/board-preference', ['shows_mature_boards' => 'yes please'])
        ->assertSessionHasErrors('shows_mature_boards');

    expect($user->refresh()->shows_mature_boards)->toBeFalse();
});

it('refuses a signed-out visitor', function (): void {
    $this->patch('/settings/board-preference', ['shows_mature_boards' => true])
        ->assertRedirect('/login');
});

/**
 * `/communities` is public, so the prop has to resolve for a request with no
 * account behind it. If it ever arrived as null the directory would have to
 * decide what null means, and the safe reading is not the obvious one.
 */
it('shares the preference as false for a signed-out visitor', function (): void {
    $this->get('/communities')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('showsMatureBoards', false));
});

it('shares the preference the signed-in anon actually holds', function (): void {
    $this->actingAs(User::factory()->create(['shows_mature_boards' => true]))
        ->get('/communities')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('showsMatureBoards', true));
});
