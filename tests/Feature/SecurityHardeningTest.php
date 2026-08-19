<?php

declare(strict_types=1);

/**
 * The headers and the defaults that are cheap to get right and expensive to
 * discover missing.
 *
 * None of this is behaviour an anon can see. It is the set of statements a
 * response makes about how it should be treated: do not guess at the type of
 * this file, do not put this page in a frame, do not send the whole URL to
 * another origin, do not send this cookie in the clear.
 */
it('tells browsers not to sniff a response type', function (): void {
    $this->get('/')->assertHeader('X-Content-Type-Options', 'nosniff');
});

it('refuses to be framed by another origin', function (): void {
    $this->get('/')->assertHeader('X-Frame-Options', 'SAMEORIGIN');
});

it('sends only the origin on a cross-origin referrer', function (): void {
    $this->get('/')->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
});

/** Not just the home page: this is a property of every web response. */
it('sets the headers on a JSON endpoint too', function (): void {
    $this->getJson('/search/suggest?q=risc')
        ->assertHeader('X-Content-Type-Options', 'nosniff');
});

/**
 * The session cookie's `Secure` flag was decided by an environment variable
 * with no default and no mention in `.env.example`, which meant the flag was
 * simply absent unless somebody knew to add it.
 */
it('always decides whether the session cookie is https-only', function (): void {
    expect(config('session.secure'))->not->toBeNull();
});

it('documents the session cookie flag in the example environment', function (): void {
    expect(file_get_contents(base_path('.env.example')))
        ->toContain('SESSION_SECURE_COOKIE=true');
});

/**
 * `composer setup` copies `.env.example` verbatim, so what it says about
 * `APP_DEBUG` is what an unattended first deploy gets.
 */
it('warns beside APP_DEBUG in the example environment', function (): void {
    $example = file_get_contents(base_path('.env.example'));
    $lines = explode("\n", $example);
    $index = array_search('APP_DEBUG=true', $lines, true);

    expect($index)->not->toBeFalse();
    expect($lines[$index - 1])->toStartWith('#');
});
