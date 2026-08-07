import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Tailwind v4 has an `--ease-*` theme namespace but no `--duration-*` one.
 * So `ease-standard` resolves to our token while `duration-hover` resolves to
 * nothing at all: it is not a utility, it emits no CSS, and the element
 * quietly falls back to Tailwind's default duration. Nothing errors, the class
 * sits in the markup looking correct, and the token it names has no effect.
 *
 * The working form is the arbitrary value: `duration-[var(--duration-hover)]`.
 *
 * This is the same failure shape as an unrecognised @font-face format hint:
 * plausible syntax, silently inert. A grep is a blunt instrument, but it is
 * the only thing that catches a class which fails by doing nothing.
 */
const MOTION_TOKENS = ['hover', 'state', 'overlay', 'enter'] as const;

const SOURCE_ROOT = join(process.cwd(), 'resources/js');

function collectSourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
        const path = join(dir, entry);

        if (statSync(path).isDirectory()) {
            return collectSourceFiles(path);
        }

        return /\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path)
            ? [path]
            : [];
    });
}

/** Comments legitimately name the tokens in prose, so drop them first. */
function stripComments(source: string): string {
    return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('motion token usage', () => {
    const files = collectSourceFiles(SOURCE_ROOT);

    it('finds source files to scan', () => {
        expect(files.length).toBeGreaterThan(20);
    });

    it.each(MOTION_TOKENS)(
        'never uses the inert bare `duration-%s` class',
        (token) => {
            const offenders = files.filter((file) => {
                const source = stripComments(readFileSync(file, 'utf8'));

                // The lookbehind is what separates the two forms: in the
                // correct `duration-[var(--duration-hover)]` the inner name is
                // preceded by a hyphen, so only a bare class matches here.
                return new RegExp(`(?<![-\\w])duration-${token}\\b`).test(
                    source,
                );
            });

            expect(
                offenders.map((file) => file.replace(process.cwd() + '/', '')),
                `Use duration-[var(--duration-${token})] instead; the bare class emits no CSS`,
            ).toEqual([]);
        },
    );
});
