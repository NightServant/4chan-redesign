import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { shareButtonVariants } from '@/components/clover/share-control';
import { buttonVariants } from '@/components/ui/button';

/**
 * 44x44 is the touch minimum this app was built to; 34-38px is the pointer
 * minimum, deliberately tighter, and desktop must not coarsen to match touch.
 * The fix lives in `touch-target-44`, a Tailwind v4 `@utility` in
 * `resources/css/app.css` that grows the *hit area* (a centred pseudo-element)
 * rather than the painted control, gated to `pointer-coarse` rather than a
 * viewport width, so a real browser resize does not change what a mouse sees.
 *
 * jsdom has no layout engine: it cannot render a `::before`, cannot evaluate
 * `@media (pointer: coarse)`, and cannot measure a box. Nothing here is a
 * measurement. Two different things are asserted instead, and they fail for
 * two different reasons:
 *
 * 1. The utility's own CSS source has the right shape (a class *contract*:
 *    if this utility is applied and the browser's pointer is coarse, the hit
 *    area is at least 44x44 -- true by construction of the CSS, not observed).
 * 2. Every icon-sized, self-centring control this source tree defines
 *    applies that utility (a source *scan*, in the exact spirit of
 *    `resources/js/lib/responsive.test.ts`: it catches the control added next
 *    month, not just a regression in the ones fixed this task).
 *
 * Whether the browser actually paints a 44px hit area on a real touchscreen
 * is neither measured nor claimed here -- that would need a real device or a
 * real layout engine, and this task's verification limits rule both out.
 */
const APP_CSS = readFileSync(
    join(process.cwd(), 'resources/css/app.css'),
    'utf8',
);

const UTILITY_NAME = 'touch-target-44';

/** Extracts `@utility touch-target-44 { ... }`'s body via brace matching, since the block nests `&::before` and `@variant`. */
function utilityBody(name: string): string {
    const marker = `@utility ${name} {`;
    const start = APP_CSS.indexOf(marker);

    if (start === -1) {
        throw new Error(`@utility ${name} not found in app.css`);
    }

    let depth = 0;
    let i = start + marker.length - 1; // at the opening brace

    for (; i < APP_CSS.length; i++) {
        if (APP_CSS[i] === '{') {
            depth++;
        }

        if (APP_CSS[i] === '}') {
            depth--;

            if (depth === 0) {
                break;
            }
        }
    }

    return APP_CSS.slice(start, i + 1);
}

describe(`${UTILITY_NAME} (class contract, resources/css/app.css)`, () => {
    const body = utilityBody(UTILITY_NAME);

    it('establishes a positioning context on the control itself', () => {
        expect(body).toMatch(/position:\s*relative/);
    });

    it('adds an empty, absolutely positioned pseudo-element', () => {
        expect(body).toMatch(/&::before/);
        expect(body).toMatch(/content:\s*(['"]){2}/);
        expect(body).toMatch(/position:\s*absolute/);
    });

    /**
     * `pointer-coarse` is Tailwind's own `@media (pointer: coarse)` variant --
     * it asks what kind of pointer is doing the pointing, not how wide the
     * viewport is. A `md:`-gated version (which `pagination.tsx` already has,
     * predating this utility) gets a touchscreen tablet in landscape wrong
     * and a narrow pointer-driven window wrong in the other direction.
     */
    it('grows the hit area only on a coarse pointer, never by viewport width', () => {
        expect(body).toMatch(/@variant pointer-coarse/);
        expect(body).not.toMatch(/@media[^)]*width/);
        expect(body).not.toMatch(/\bmd:|@variant\s+md\b/);
    });

    it('sizes the hit area to at least 44px in both axes, never smaller than the control', () => {
        const gated = body.slice(body.indexOf('@variant pointer-coarse'));

        expect(gated).toMatch(/width:\s*max\(44px,\s*100%\)/);
        expect(gated).toMatch(/height:\s*max\(44px,\s*100%\)/);
    });

    it('centres the grown hit area on the control', () => {
        const gated = body.slice(body.indexOf('@variant pointer-coarse'));

        expect(gated).toMatch(/top:\s*50%/);
        expect(gated).toMatch(/left:\s*50%/);
        expect(gated).toMatch(/translate\(-50%,\s*-50%\)/);
    });
});

/**
 * `Button`'s `icon` size and its centring live in two different `cva`
 * entries (the size variant and the shared base classes), so they never sit
 * in one string literal together and the source scan below cannot see them.
 * This calls the real function instead of reading source.
 */
describe('Button size="icon" (class contract)', () => {
    it('carries touch-target-44', () => {
        expect(buttonVariants({ size: 'icon' })).toContain(UTILITY_NAME);
    });
});

/**
 * Same blind spot: `ShareControl`'s size (`sm`/`md`) and its centring are
 * two different `cva` entries too, so the fix has to live in the shared base
 * array to cover both, and a direct call is the only way to see the result.
 * `ThreadCard` uses `size="sm"` -- the smaller, 28px-tall one.
 */
describe('shareButtonVariants (class contract)', () => {
    it('carries touch-target-44 at every size', () => {
        expect(shareButtonVariants({ size: 'sm' })).toContain(UTILITY_NAME);
        expect(shareButtonVariants({ size: 'md' })).toContain(UTILITY_NAME);
    });
});

/**
 * The source scan: every icon-sized, self-centring control this tree
 * defines must carry `touch-target-44` in the same class string, or be on
 * the documented exception list below.
 */
const SOURCE_ROOT = join(process.cwd(), 'resources/js');

function collectTsxFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
        const path = join(dir, entry);

        if (statSync(path).isDirectory()) {
            return collectTsxFiles(path);
        }

        return /\.tsx$/.test(path) && !/\.test\.tsx$/.test(path) ? [path] : [];
    });
}

function stripComments(source: string): string {
    return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/** Single-, double- and template-quoted strings, comments already stripped. */
function stringLiterals(source: string): string[] {
    return (
        source.match(
            /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g,
        ) ?? []
    );
}

const SMALL_SIZE = /size-(\d+(?:\.5)?)\b/;
const SMALL_HEIGHT = /\bh-\[(\d+)px\]/;
/** This codebase's own shape for a box that centres its own single glyph or its own row content -- an icon button, an icon-shaped control, or a nav row. */
const SELF_CENTRING = /items-center|place-items-center/;
/** A control that cannot itself receive a pointer event needs no hit area. */
const INERT = /pointer-events-none/;

function isUndersizedControl(literal: string): boolean {
    if (INERT.test(literal) || !SELF_CENTRING.test(literal)) {
        return false;
    }

    const sizeMatch = literal.match(SMALL_SIZE);

    if (sizeMatch && parseFloat(sizeMatch[1]) < 11) {
        return true;
    }

    const heightMatch = literal.match(SMALL_HEIGHT);

    return Boolean(heightMatch) && parseInt(heightMatch![1], 10) < 44;
}

/**
 * Every entry here is a real, verified exception, not a blanket skip --
 * each is either decorative (never itself the pointer's target, so it has
 * no hit area to grow) or a real control this task's brief scoped outside
 * "app chrome." None of these are silently fine; they are follow-up
 * candidates flagged in the task 5 report, not endorsed as correct.
 */
const ALLOWED_FILES = new Set([
    // Decorative icon wrappers (`aria-hidden`), never independently the
    // pointer's target -- the row or button around them is.
    'resources/js/components/passkey-item.tsx',
    'resources/js/components/clover/notification-item.tsx',
    'resources/js/components/auth/auth-brand-panel.tsx',
    // Radix's own `select-item-indicator`: a positioning wrapper for a
    // checkmark glyph inside a `<SelectItem>` row that is already the real,
    // much larger click target.
    'resources/js/components/ui/select.tsx',
    // Real, currently undersized controls outside this task's "app chrome"
    // scope (header, bottom bar, drawer/sidebar rows, ThreadCard's share and
    // bookmark buttons, the search field) -- flagged in the task 5 report.
    'resources/js/components/ui/dialog.tsx',
    'resources/js/components/clover/comment-tree.tsx',
    'resources/js/components/clover/switch.tsx',
    // Already has its own hit-area mechanism (`before:-inset-[5px]`), just
    // gated on `md:` viewport width rather than `pointer-coarse:` -- flagged
    // as the follow-up this task's own guard is meant to prevent recurring.
    'resources/js/components/clover/pagination.tsx',
]);

describe('every icon-sized, self-centring control carries touch-target-44', () => {
    const files = collectTsxFiles(SOURCE_ROOT);

    it('finds source files to scan', () => {
        expect(files.length).toBeGreaterThan(20);
    });

    it('flags no undersized control outside the documented exceptions', () => {
        const offenders = files.flatMap((file) => {
            const relative = file.replace(`${process.cwd()}/`, '');

            if (ALLOWED_FILES.has(relative)) {
                return [];
            }

            const literals = stringLiterals(
                stripComments(readFileSync(file, 'utf8')),
            );

            return literals.some(
                (literal) =>
                    isUndersizedControl(literal) &&
                    !literal.includes('touch-target-44'),
            )
                ? [relative]
                : [];
        });

        expect(
            offenders,
            "Add touch-target-44 to the control's className, or add the file to ALLOWED_FILES above with a one-line reason if it is genuinely decorative or out of scope",
        ).toEqual([]);
    });
});
