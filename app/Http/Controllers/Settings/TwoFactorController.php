<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\TwoFactorAuthenticationRequest;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Fortify\Features;

/**
 * Two-factor authentication, on a page of its own.
 *
 * The header's account menu links straight at this, and it used to link at
 * `/settings#two-factor` — a fragment on a page of six panels, which lands an
 * anon somewhere in the middle of a long form and asks them to find the thing
 * they pressed a button to reach.
 *
 * The settings page keeps a row saying whether two-factor is on, because that
 * is worth knowing while looking at the rest of the account, and the row links
 * here. Managing it happens in one place.
 *
 * ## Behind a password
 *
 * `RequirePassword` on the route rather than a check in the body. Turning
 * two-factor off is the single most useful thing an attacker can do with a
 * borrowed session, and reading the page alone reveals whether it is on. This
 * is the gate the old security page carried, applied to the page that actually
 * needs it rather than to everything an anon might have come to settings for.
 */
class TwoFactorController extends Controller
{
    public function edit(TwoFactorAuthenticationRequest $request): Response
    {
        abort_unless(Features::canManageTwoFactorAuthentication(), 404);

        $request->ensureStateIsValid();

        return Inertia::render('settings/two-factor', [
            'canManageTwoFactor' => true,
            'twoFactorEnabled' => $request->user()->hasEnabledTwoFactorAuthentication(),
            'requiresConfirmation' => Features::optionEnabled(
                Features::twoFactorAuthentication(),
                'confirm'
            ),
        ]);
    }
}
