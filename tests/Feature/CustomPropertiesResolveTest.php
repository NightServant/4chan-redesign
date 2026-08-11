<?php

declare(strict_types=1);

use Symfony\Component\Finder\Finder;

/**
 * Every `var(--x)` written in a component must resolve to a property the
 * stylesheet actually defines.
 *
 * An undefined custom property with no fallback is invalid at computed-value
 * time, and it does not fail alone: it takes the whole declaration with it. A
 * single `var(--border)` inside a `background-image` deletes the entire image,
 * so the markup, the class list and the inline style all look correct and
 * nothing renders.
 *
 * That is exactly how the homepage hero shipped its gridlines to `main` twice
 * without them ever appearing. The authored variables are `--border-hairline`
 * and `--border-strong`; `--border` was never one of them.
 *
 * This is the eighth instance of the same class of defect on this project, and
 * the second the compiled stylesheet was needed to see.
 */

/**
 * Properties injected at runtime rather than authored in `app.css`. Radix
 * measures its triggers and writes these onto the element itself, so they are
 * legitimately absent from the stylesheet.
 */
const RUNTIME_INJECTED_PROPERTIES = [
    '--radix-navigation-menu-viewport-height',
    '--radix-navigation-menu-viewport-width',
    '--radix-select-trigger-height',
    '--radix-select-trigger-width',
];

/**
 * Tailwind's own namespaces, resolved by the compiler rather than declared as
 * a property. `--spacing` and the `--duration-*` family are read by utilities
 * and arbitrary values, not looked up at runtime.
 */
const COMPILER_RESOLVED_PREFIXES = [
    '--spacing',
    '--duration-',
    '--tw-',
];

it('never references a custom property the stylesheet does not define', function (): void {
    [$css] = compiledStylesheet();

    $sources = Finder::create()
        ->files()
        ->in(resource_path('js'))
        ->name('*.tsx')
        ->name('*.ts')
        ->notName('*.test.tsx')
        ->notName('*.test.ts');

    $offenders = [];

    foreach ($sources as $file) {
        preg_match_all(
            '/var\(\s*(--[a-z0-9-]+)/i',
            (string) $file->getContents(),
            $matches,
        );

        foreach (array_unique($matches[1]) as $property) {
            if (in_array($property, RUNTIME_INJECTED_PROPERTIES, true)) {
                continue;
            }

            foreach (COMPILER_RESOLVED_PREFIXES as $prefix) {
                if (str_starts_with($property, $prefix)) {
                    continue 2;
                }
            }

            if (! str_contains($css, $property.':')) {
                $offenders[] = $file->getRelativePathname().' → var('.$property.')';
            }
        }
    }

    expect(array_unique($offenders))->toBe(
        [],
        'these resolve to nothing, which invalidates the whole declaration they sit in',
    );
});
