<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\TwoFactorAuthenticationRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Fortify\Features;

/**
 * The one settings screen.
 *
 * There were two: `settings/profile` held the name, the email, the adult-board
 * preference and account deletion, while `settings/security` held the password,
 * two-factor and passkeys. Nothing about that split described anything a reader
 * would look for — "change my email" and "change my password" are one errand —
 * and it cost a section nav whose entire job was to move between two pages of
 * three panels each.
 *
 * Both are this. `settings/profile` and `settings/security` redirect here so
 * anything already bookmarked still lands somewhere.
 *
 * ## Password confirmation survived the merge
 *
 * The old security page sat behind `RequirePassword`, so reading it meant
 * proving you were the account holder and not someone who had walked up to an
 * unlocked laptop. Merging the pages naively would have thrown that away: the
 * panels would render for anyone holding a live session, listing the names of
 * every registered passkey and whether two-factor is on.
 *
 * Putting `RequirePassword` on the merged route instead is the other bad
 * answer — it would demand a password to correct a typo in a display name.
 *
 * So the gate moved from the page to the two panels that need it. Everything
 * else renders immediately; two-factor and passkeys render a prompt until the
 * password has been confirmed, and `settings/confirm` is the door that does it.
 * Fortify already requires confirmation on the mutations themselves, so this is
 * about what the page *discloses*, which is the half that would otherwise have
 * gone quiet.
 */
class SettingsController extends Controller
{
    /**
     * Show every setting this account has.
     *
     * Takes `TwoFactorAuthenticationRequest` because the two-factor state has
     * to be validated before it is read, exactly as the security page did.
     */
    public function edit(TwoFactorAuthenticationRequest $request): Response
    {
        $unlocked = $this->passwordRecentlyConfirmed($request);

        $props = [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
            'securityUnlocked' => $unlocked,
            'canManageTwoFactor' => Features::canManageTwoFactorAuthentication(),
            'canManagePasskeys' => Features::canManagePasskeys(),
            'passkeys' => [],
            'twoFactorEnabled' => false,
        ];

        /**
         * Whether two-factor is on, sent whether or not the password has been
         * confirmed.
         *
         * The screen shows this as a status row now rather than as a panel, and
         * a row that reports "Off" because the state was withheld is worse than
         * no row: it tells an anon their account is unprotected when it is not.
         * It is one bit, it is about the reader's own account, and everything
         * the two-factor page itself reveals stays behind `RequirePassword`.
         */
        if (Features::canManageTwoFactorAuthentication()) {
            $request->ensureStateIsValid();

            $props['twoFactorEnabled'] = $request->user()->hasEnabledTwoFactorAuthentication();
        }

        if (! $unlocked) {
            return Inertia::render('settings/index', $props);
        }

        if (Features::canManagePasskeys()) {
            $props['passkeys'] = $request->user()
                ->passkeys()
                ->select(['id', 'name', 'credential', 'created_at', 'last_used_at'])
                ->latest()
                ->get()
                ->map(fn ($passkey) => [
                    'id' => $passkey->id,
                    'name' => $passkey->name,
                    'authenticator' => $passkey->authenticator,
                    'created_at_diff' => $passkey->created_at->diffForHumans(),
                    'last_used_at_diff' => $passkey->last_used_at?->diffForHumans(),
                ])
                ->values()
                ->all();
        }

        return Inertia::render('settings/index', $props);
    }

    /**
     * Whether the password was confirmed recently enough to show the panels
     * `RequirePassword` used to guard.
     *
     * The same session key and the same timeout the framework's own middleware
     * reads, so the two cannot drift into disagreeing about what "recently"
     * means.
     */
    private function passwordRecentlyConfirmed(TwoFactorAuthenticationRequest $request): bool
    {
        $confirmedAt = $request->session()->get('auth.password_confirmed_at');

        if ($confirmedAt === null) {
            return false;
        }

        return (time() - (int) $confirmedAt) < config('auth.password_timeout', 10800);
    }
}
