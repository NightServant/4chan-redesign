<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Fortify\Features;

/**
 * The one settings screen, and the gate that survived the merge onto it.
 *
 * `settings/profile` and `settings/security` were two pages; the second sat
 * behind `RequirePassword`, so reading it meant proving you were the account
 * holder rather than whoever sat down at an unlocked laptop. Merging them
 * naively drops that: the panels would render for anyone with a live session,
 * listing every registered passkey by name and whether two-factor is on.
 *
 * Putting the middleware on the merged route is the other bad answer — it
 * demands a password to correct a typo in a display name. So the gate moved to
 * the two panels that need it, and these tests are what hold it there.
 */
test('settings page is displayed', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('settings.edit'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('settings/index'));
});

test('the merged page needs no password to reach', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('settings.edit'))
        ->assertOk();
});

test('two-factor and passkey state stay locked until the password is confirmed', function () {
    $this->skipUnlessFortifyHas(Features::twoFactorAuthentication());

    Features::twoFactorAuthentication([
        'confirm' => true,
        'confirmPassword' => true,
    ]);
    Features::passkeys([
        'confirmPassword' => true,
    ]);

    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('settings.edit'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('securityUnlocked', false)
            ->where('passkeys', [])
            ->missing('twoFactorEnabled'),
        );
});

test('confirming the password unlocks both security panels', function () {
    $this->skipUnlessFortifyHas(Features::twoFactorAuthentication());

    Features::twoFactorAuthentication([
        'confirm' => true,
        'confirmPassword' => true,
    ]);
    Features::passkeys([
        'confirmPassword' => true,
    ]);

    $user = User::factory()->create();

    $this->actingAs($user)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->get(route('settings.edit'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('settings/index')
            ->where('securityUnlocked', true)
            ->where('canManagePasskeys', true)
            ->where('passkeys', [])
            ->where('canManageTwoFactor', true)
            ->where('twoFactorEnabled', false),
        );
});

/**
 * A confirmation from three hours ago is not a confirmation. Read through the
 * same config the framework's own middleware reads, so the two cannot drift
 * into disagreeing about what "recently" means.
 */
test('a stale password confirmation does not unlock anything', function () {
    $this->skipUnlessFortifyHas(Features::twoFactorAuthentication());

    $user = User::factory()->create();
    $timeout = config('auth.password_timeout', 10800);

    $this->actingAs($user)
        ->withSession(['auth.password_confirmed_at' => time() - $timeout - 1])
        ->get(route('settings.edit'))
        ->assertInertia(fn (Assert $page) => $page->where('securityUnlocked', false));
});

test('settings renders without two factor when the feature is disabled', function () {
    $this->skipUnlessFortifyHas(Features::twoFactorAuthentication());

    config(['fortify.features' => []]);

    $user = User::factory()->create();

    $this->actingAs($user)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->get(route('settings.edit'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('settings/index')
            ->where('canManagePasskeys', false)
            ->where('passkeys', [])
            ->where('canManageTwoFactor', false)
            ->missing('twoFactorEnabled')
            ->missing('requiresConfirmation'),
        );
});

/**
 * The door the locked panels link at. `RequirePassword` records where the anon
 * was headed and Fortify sends them back once they have proved it, which is why
 * this is a route rather than a link straight at `password.confirm`.
 */
test('the unlock route asks for the password and returns to settings', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('settings.confirm'))
        ->assertRedirect(route('password.confirm'));

    $this->actingAs($user)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->get(route('settings.confirm'))
        ->assertRedirect(route('settings.edit'));
});

/** Two pages became one. Anything already bookmarked still has to land. */
test('the two old settings urls redirect to the merged page', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->get('/settings/profile')->assertRedirect('/settings');
    $this->actingAs($user)->get('/settings/security')->assertRedirect('/settings');
});
