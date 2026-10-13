<?php

namespace App\Providers;

use Carbon\CarbonImmutable;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Inertia\ExceptionResponse;
use Inertia\Inertia;
use Inertia\Support\Header;

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
        $this->configureRateLimits();
    }

    /**
     * The search page's limits: one for searching, one for scrolling.
     *
     * The page route used to take `throttle:30,1` for everything, which was
     * sized for a person typing queries and also counted the requests
     * `<InfiniteScroll>` sends for each next page of a tab. A reader scrolling
     * a long result list ran into it, and Inertia shows a 429 as a full-screen
     * modal over the results. A follow-up carries the merge-intent header, so
     * it is counted in a bucket of its own: still bounded, because each page
     * is the same `LIKE` scan, but at a pace a scroll can keep without
     * touching the thirty a minute that bound new searches.
     *
     * By address, as before: the route has no account to key on.
     */
    protected function configureRateLimits(): void
    {
        RateLimiter::for('search', fn (Request $request): Limit => $request->hasHeader(Header::INFINITE_SCROLL_MERGE_INTENT)
            ? Limit::perMinute(120)->by('scroll|'.$request->ip())
            : Limit::perMinute(30)->by('search|'.$request->ip()));
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

        /**
         * Resources are Inertia props here, not a JSON API envelope.
         *
         * `JsonResource` wraps a collection in a `data` key by default, which
         * is right for an API response and wrong for a page prop: the client
         * types declare `threads: Thread[]`, so every collection would arrive
         * as `{ data: Thread[] }` and every page would read `undefined` off it.
         * That fails as an empty list rather than an error, which is this
         * project's least favourite kind of bug.
         */
        JsonResource::withoutWrapping();

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
