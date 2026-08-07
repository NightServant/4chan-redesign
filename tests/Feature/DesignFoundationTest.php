<?php

declare(strict_types=1);

/**
 * Guards the Clover design foundation.
 *
 * These assertions read the compiled stylesheet, so they only run once assets
 * are built. CI builds before running Pest; locally, run `npm run build` first
 * or these are skipped rather than failing spuriously.
 */

/**
 * @return array{0: string, 1: string} The compiled CSS and the build directory
 */
function compiledStylesheet(): array
{
    $buildPath = public_path('build');
    $manifestPath = $buildPath.'/manifest.json';

    if (! file_exists($manifestPath)) {
        test()->markTestSkipped('Assets are not built. Run `npm run build`.');
    }

    /** @var array<string, array{file?: string}> $manifest */
    $manifest = json_decode((string) file_get_contents($manifestPath), true);

    $cssFile = $manifest['resources/css/app.css']['file'] ?? null;

    expect($cssFile)->not->toBeNull('app.css is missing from the Vite manifest.');

    return [(string) file_get_contents($buildPath.'/'.$cssFile), $buildPath];
}

it('renders the home page', function (): void {
    $this->get('/')->assertOk();
});

it('compiles the Clover dark token scope', function (): void {
    [$css] = compiledStylesheet();

    expect($css)
        ->toContain('--bg:#080a09')
        ->toContain('--surface:#111513')
        ->toContain('--primary:#34c76f')
        ->toContain('--text-primary:#f2f5f2');
});

it('compiles the Clover light token scope', function (): void {
    [$css] = compiledStylesheet();

    // The minifier shortens #ffffff to #fff.
    expect($css)
        ->toContain('--bg:#f6f8f6')
        ->toContain('--surface:#fff')
        ->toContain('--primary:#2aa85c')
        ->toContain('--text-primary:#0d1411');
});

/**
 * The design prototype overrides light-mode `--text-on-primary` to #FFFFFF,
 * which yields 3.06:1 against the light primary (#2AA85C) and fails WCAG AA
 * for normal text. The authored #06130B yields 6.20:1. Do not reintroduce it.
 */
it('keeps primary button text at an accessible contrast in both themes', function (): void {
    [$css] = compiledStylesheet();

    expect($css)
        ->toContain('--text-on-primary:#06130b')
        ->not->toContain('--text-on-primary:#fff');
});

it('ships exactly two font families and no mono utility', function (): void {
    [$css] = compiledStylesheet();

    expect($css)
        ->toContain('Inter')
        ->toContain('Space Grotesk')
        ->not->toContain('Instrument Sans')
        ->not->toMatch('/\.font-mono\{/');
});

it('emits both variable font families as build assets', function (): void {
    [, $buildPath] = compiledStylesheet();

    $fonts = glob($buildPath.'/assets/*.ttf') ?: [];
    $names = implode(' ', array_map('basename', $fonts));

    expect($names)
        ->toContain('Inter-Variable')
        ->toContain('Inter-Italic-Variable')
        ->toContain('SpaceGrotesk-Variable');
});
