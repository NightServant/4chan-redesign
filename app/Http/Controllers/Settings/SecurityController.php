<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\PasswordUpdateRequest;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

/**
 * What is left of the security page: the password change itself.
 *
 * The page went. Two settings screens split along a line nobody looks for
 * became one, and reading the panels this controller used to render is now
 * `SettingsController`'s job. This kept the write, because a password update is
 * a password update wherever its form happens to be drawn.
 */
class SecurityController extends Controller
{
    /**
     * Update the user's password.
     */
    public function update(PasswordUpdateRequest $request): RedirectResponse
    {
        $request->user()->update([
            'password' => $request->password,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Password updated.')]);

        return back();
    }
}
