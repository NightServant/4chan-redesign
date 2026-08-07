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
        ->toMatch('/--bg:\s*oklch\(14\./')
        ->toMatch('/--surface:\s*oklch\(19\./')
        ->toMatch('/--primary:\s*oklch\(73\./')
        ->toMatch('/--text-primary:\s*oklch\(96\./');
});

it('compiles the Clover light token scope', function (): void {
    [$css] = compiledStylesheet();

    expect($css)
        ->toMatch('/--bg:\s*oklch\(97\./')
        ->toMatch('/--surface:\s*oklch\(99\./')
        ->toMatch('/--primary:\s*oklch\(64\./')
        ->toMatch('/--text-primary:\s*oklch\(18\./');
});

/**
 * Every colour is authored in OKLCH, and no neutral is pure. Pure #fff / #000
 * flatten depth against neutrals that all carry a slight green tint, so the
 * lightest surface is a tinted near-white rather than white.
 */
it('authors colour in OKLCH with no pure white or black neutral', function (): void {
    [$css] = compiledStylesheet();

    expect($css)
        ->not->toMatch('/--surface:\s*(#fff\b|#ffffff|white|oklch\(100%)/')
        ->not->toMatch('/--bg:\s*(#fff\b|#ffffff|#000\b|#000000|white|black)/');
});

/**
 * The design prototype overrides light-mode `--text-on-primary` to #FFFFFF,
 * which yields 3.06:1 against the light primary (#2AA85C) and fails WCAG AA
 * for normal text. The authored #06130B yields 6.20:1. Do not reintroduce it.
 */
it('keeps primary button text at an accessible contrast in both themes', function (): void {
    [$css] = compiledStylesheet();

    expect($css)
        ->toMatch('/--text-on-primary:\s*oklch\(17\./')
        ->not->toMatch('/--text-on-primary:\s*(#fff\b|#ffffff|white|oklch\(100%)/');
});

it('ships exactly two font families and no mono utility', function (): void {
    [$css] = compiledStylesheet();

    expect($css)
        ->toContain('Inter')
        ->toContain('Space Grotesk')
        ->not->toContain('Instrument Sans')
        ->not->toMatch('/\.font-mono\{/');
});

/**
 * An unrecognised format hint makes the browser skip that @font-face source
 * entirely — the file is never fetched and text silently falls back to the
 * system stack, which looks identical to "the font didn't change". The
 * `-variations` suffixed hints are an obsolete CSS Fonts Level 4 draft that
 * Chrome and Firefox reject; `woff2` is universally supported.
 */
it('declares font sources with a format hint browsers recognise', function (): void {
    [$css] = compiledStylesheet();

    expect($css)
        ->toContain('format("woff2")')
        ->not->toContain('-variations');
});

it('emits both variable font families as compressed build assets', function (): void {
    [, $buildPath] = compiledStylesheet();

    $fonts = glob($buildPath.'/assets/*.woff2') ?: [];
    $names = implode(' ', array_map('basename', $fonts));

    expect($names)
        ->toContain('Inter-Variable')
        ->toContain('Inter-Italic-Variable')
        ->toContain('SpaceGrotesk-Variable');

    // Uncompressed TTFs would roughly double the payload for no benefit.
    expect(glob($buildPath.'/assets/*.ttf') ?: [])->toBeEmpty();
});
