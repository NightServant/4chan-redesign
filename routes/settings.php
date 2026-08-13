<?php

use App\Http\Controllers\Settings\BoardPreferenceController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\SecurityController;
use App\Http\Controllers\Settings\SettingsController;
use Illuminate\Auth\Middleware\RequirePassword;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    /**
     * One settings screen. `settings/profile` and `settings/security` were two,
     * split along a line that described nothing a reader looks for: changing an
     * email address and changing a password are the same errand. Both redirect
     * here, so anything already bookmarked still lands somewhere.
     */
    Route::get('settings', [SettingsController::class, 'edit'])->name('settings.edit');

    Route::redirect('settings/profile', '/settings');
    Route::redirect('settings/security', '/settings');

    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');

    /**
     * The handle and bio the account screen shows. Its own endpoint because it
     * is submitted from a dialog on that screen rather than from the settings
     * form, and `profile.update` requires a name and an email that dialog has
     * no business asking for.
     */
    Route::patch('account/profile', [ProfileController::class, 'updateIdentity'])
        ->name('profile-identity.update');

    /**
     * Whether adult boards appear in the directory. Its own endpoint because
     * it saves on flip rather than on a form submit.
     */
    Route::patch('settings/board-preference', [BoardPreferenceController::class, 'update'])
        ->name('board-preference.update');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    /**
     * The door to the two-factor and passkey panels.
     *
     * The security page used to carry `RequirePassword` itself. With one
     * settings screen that would demand a password to fix a typo in a display
     * name, so the gate moved to the panels that need it and this route is what
     * opens them: the middleware records where the anon was headed, Fortify
     * takes the password, and this sends them back to the panels now unlocked.
     *
     * A route rather than a link straight at `password.confirm` because only
     * the middleware sets the intended URL. Without it, confirming a password
     * drops the anon on the dashboard wondering whether it worked.
     */
    Route::get('settings/confirm', fn () => redirect()->route('settings.edit'))
        ->middleware(RequirePassword::class)
        ->name('settings.confirm');

    Route::put('settings/password', [SecurityController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('user-password.update');
    /**
     * `settings/appearance` is gone. It held one control, a light/dark
     * switch, and the header carries that switch on every screen: the page
     * was a second way to reach a toggle that is always one press away.
     */
});

Route::get('.well-known/passkey-endpoints', function () {
    return response()->json([
        'enroll' => route('settings.edit'),
        'manage' => route('settings.edit'),
    ]);
})->name('well-known.passkeys');
