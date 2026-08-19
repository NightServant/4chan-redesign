<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileDeleteRequest;
use App\Http\Requests\Settings\ProfileIdentityRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

/**
 * Writes to the anon's profile. It no longer renders anything: the screen these
 * fields live on is `SettingsController`, which is one page rather than the two
 * this used to be half of.
 */
class ProfileController extends Controller
{
    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Profile updated.')]);

        return to_route('settings.edit');
    }

    /**
     * Update what the account screen shows: the handle and the bio.
     *
     * These were displayed by the profile and writable by nothing. The screen
     * put a handle at the top of the page and a line underneath it, and "Edit
     * profile" led to a settings form that edited neither — so the one button
     * on the profile promising to change it changed nothing a reader could see.
     *
     * Separate from `update` because it is opened in a dialog on the profile
     * rather than on the settings page, and because it must not demand an email
     * address to fix a typo in a bio.
     */
    public function updateIdentity(ProfileIdentityRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated())->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Profile updated.')]);

        return back();
    }

    /**
     * Delete the user's profile.
     *
     * The only feedback this used to give was that the page changed and the
     * account menu was gone. Deleting an account is the most consequential
     * thing an anon can do here and it is irreversible, so it says what
     * happened -- including the part they cannot see, which is that the files
     * they uploaded went with it. `UserObserver` is what makes that true.
     *
     * Flashed after the session is invalidated, not before: `invalidate()`
     * empties the session it would otherwise have been written into.
     */
    public function destroy(ProfileDeleteRequest $request): RedirectResponse
    {
        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Your account is gone, along with anything you uploaded. Posts stay, unsigned.'),
        ]);

        return redirect('/');
    }
}
