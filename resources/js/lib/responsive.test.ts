import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * `grid-template-columns: repeat(auto-fill, minmax(320px, 1fr))` reads as
 * responsive — it is a `repeat()` track, nothing here mentions a fixed column
 * count — but `minmax()`'s first argument is a *minimum*, not a target, and a
 * bare pixel minimum is a promise the browser cannot keep below that width.
 * `board-directory.tsx` used `minmax(320px, 1fr)` inside a 320px-viewport
 * container that is 272px wide after its own padding: every cell overflows
 * by 48px and cells overlap their neighbours. `account.tsx`'s media grid did
 * the same at `minmax(220px, 1fr)`, and both `site-footer.tsx` and
 * `how-it-works.tsx` set the identical pattern through inline
 * `gridTemplateColumns` strings instead of a class.
 *
 * The fix in every case is `minmax(min(Npx, 100%), 1fr)`: `min()` lets the
 * track's floor collapse to the container's own width once the container is
 * narrower than `Npx`, instead of forcing the container to be at least
 * `Npx` wide. `minmax(0, ...)` and `minmax(min(...), ...)` are already safe —
 * this only ever flags a *bare* pixel length as the first argument.
 *
 * jsdom has no layout engine, so it cannot measure the overflow this
 * produces; a static scan for the unsafe pattern is the only instrument that
 * catches it without a real browser.
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

/** Comments legitimately name the pattern in prose, so drop them first. */
function stripComments(source: string): string {
    return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/**
 * Matches `minmax(` followed directly by a bare pixel length. The fixed form
 * wraps that length in `min(...)`, so `minmax(min(320px,100%),1fr)` starts
 * with `m`, not a digit, and never matches; `minmax(0, ...)` starts with `0`
 * and never matches either.
 */
const BARE_PIXEL_MINMAX = /minmax\(\s*\d+(?:\.\d+)?px\s*,/;

describe('minmax() tracks never carry a bare pixel minimum', () => {
    const files = collectTsxFiles(SOURCE_ROOT);

    it('finds source files to scan', () => {
        expect(files.length).toBeGreaterThan(20);
    });

    it('never uses minmax(Npx, ...) with an unguarded pixel minimum', () => {
        const offenders = files.filter((file) =>
            BARE_PIXEL_MINMAX.test(stripComments(readFileSync(file, 'utf8'))),
        );

        expect(
            offenders.map((file) => file.replace(process.cwd() + '/', '')),
            'Wrap the minimum in min(Npx, 100%) so the track can collapse below its ideal width instead of overflowing a narrower container',
        ).toEqual([]);
    });
});
