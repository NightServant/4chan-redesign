<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Laravel\Fortify\Features;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureActions();
        $this->configureViews();
        $this->configureRateLimiting();
    }

    /**
     * Configure Fortify actions.
     */
    private function configureActions(): void
    {
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);
        Fortify::createUsersUsing(CreateNewUser::class);
    }

    /**
     * Configure Fortify views.
     */
    private function configureViews(): void
    {
        Fortify::loginView(fn (Request $request) => Inertia::render('auth/login', [
            'canResetPassword' => Features::enabled(Features::resetPasswords()),
            'status' => $request->session()->get('status'),
        ]));

        Fortify::resetPasswordView(fn (Request $request) => Inertia::render('auth/reset-password', [
            'email' => $request->email,
            'token' => $request->route('token'),
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
        ]));

        Fortify::requestPasswordResetLinkView(fn (Request $request) => Inertia::render('auth/forgot-password', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::verifyEmailView(fn (Request $request) => Inertia::render('auth/verify-email', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::registerView(fn () => Inertia::render('auth/register', [
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
        ]));

        Fortify::twoFactorChallengeView(fn () => Inertia::render('auth/two-factor-challenge'));

        Fortify::confirmPasswordView(fn () => Inertia::render('auth/confirm-password'));
    }

    /**
     * Configure rate limiting.
     *
     * `login`, `two-factor` and `passkeys` are named because Fortify resolves
     * them from `config('fortify.limiters')` and applies them itself.
     *
     * `register` and `password-reset` are named for the same reason and applied
     * a different way: this version of Fortify reads a limiter from config for
     * those four routes only, and registers `register`, `forgot-password` and
     * `reset-password` with `guest` and nothing else. `ThrottleFortifyRoutes`,
     * in the `web` group, is what puts them on. Defining them here anyway keeps
     * every limit on an auth route in one file.
     */
    private function configureRateLimiting(): void
    {
        /**
         * Registration, by address. Every attempt runs a bcrypt hash whether
         * or not the address is already taken, so this is expensive to answer
         * and free to ask; five a minute is more accounts than anyone opens by
         * hand and no use at all for filling a table.
         */
        RateLimiter::for('register', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });

        /**
         * Both halves of a password reset, by address and by the address given.
         *
         * Asking for a link sends mail to an inbox the caller chose but does
         * not own, which is how a reset form becomes a way to post someone
         * else's mail from Clover's sending reputation. Submitting a new one
         * guesses at a token. Keyed on both so that neither a single client
         * working through many addresses nor many clients working on one gets
         * a free run.
         */
        RateLimiter::for('password-reset', function (Request $request) {
            $email = $request->input('email');

            return [
                Limit::perMinute(5)->by('ip|'.$request->ip()),
                Limit::perMinute(5)->by('email|'.Str::transliterate(Str::lower(is_string($email) ? $email : ''))),
            ];
        });

        RateLimiter::for('two-factor', function (Request $request) {
            return Limit::perMinute(5)->by($request->session()->get('login.id'));
        });

        RateLimiter::for('login', function (Request $request) {
            $throttleKey = Str::transliterate(Str::lower($request->input(Fortify::username())).'|'.$request->ip());

            return Limit::perMinute(5)->by($throttleKey);
        });

        RateLimiter::for('passkeys', function (Request $request) {
            return Limit::perMinute(10)->by(
                ($request->input('credential.id') ?: $request->session()->getId()).'|'.$request->ip(),
            );
        });
    }
}
