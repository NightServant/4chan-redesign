<?php

namespace App\Providers;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Inertia\ExceptionResponse;
use Inertia\Inertia;

class AppServiceProvider extends ServiceProvider
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
        $this->configureDefaults();
        $this->configureErrorPages();
    }

    /**
     * Render HTTP errors through Clover's own screen rather than Laravel's.
     *
     * A 404 is a navigational dead end, not a crash: the error page keeps the
     * app chrome so an anon who mistypes a board slug can carry on from the
     * sidebar instead of reaching for the back button.
     */
    protected function configureErrorPages(): void
    {
        Inertia::handleExceptionsUsing(function (ExceptionResponse $response): mixed {
            $status = $response->statusCode();

            /**
             * With debug on, a 500 already renders a stack trace that explains
             * the failure. Replacing it with a styled apology is how a
             * developer loses twenty minutes to a bug the framework had
             * already told them about, so that one case falls through.
             */
            if ($status === 500 && config('app.debug')) {
                return null;
            }

            if (! in_array($status, [403, 404, 419, 500, 503], true)) {
                return null;
            }

            return $response
                ->render('error', ['status' => $status])
                ->withSharedData();
        });
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
