import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every screen has to describe itself.
 *
 * `PageMeta` is not rendered into the DOM these tests can query — Inertia's
 * `<Head>` writes to the document head, and the mock every page test installs
 * stubs it out — so asserting the tags through a render would assert nothing.
 * What is checkable, and what actually goes wrong, is a page that forgets to
 * describe itself at all: it inherits the site-level card and previews as a
 * generic link to Clover rather than as itself.
 *
 * So this reads the pages as files. Crude, and it is the only thing that
 * catches the next page somebody adds.
 */
const PAGES_DIR = join(process.cwd(), 'resources/js/pages');

function pageFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
        const path = join(dir, entry);

        if (statSync(path).isDirectory()) {
            return pageFiles(path);
        }

        const isPage =
            entry.endsWith('.tsx') &&
            !entry.endsWith('.test.tsx') &&
            !entry.endsWith('.d.ts');

        return isPage ? [path] : [];
    });
}

describe('page metadata', () => {
    const pages = pageFiles(PAGES_DIR);

    it('finds the pages it is meant to be checking', () => {
        expect(pages.length).toBeGreaterThan(15);
    });

    it.each(pages.map((path) => [path.replace(`${process.cwd()}/`, ''), path]))(
        '%s describes itself with PageMeta',
        (_name, path) => {
            const source = readFileSync(path, 'utf8');

            expect(source).toContain('<PageMeta');
        },
    );

    /**
     * `PageMeta` supersedes the bare `<Head title>` every page used to carry.
     * Both would set a title and only one would set a description, so a page
     * left on the old call is a page with no description — which is exactly
     * the state this task found the whole application in.
     */
    it.each(pages.map((path) => [path.replace(`${process.cwd()}/`, ''), path]))(
        '%s sets no title outside PageMeta',
        (_name, path) => {
            const source = readFileSync(path, 'utf8');

            expect(source).not.toMatch(/<Head\s+title=/);
        },
    );

    /**
     * A description that is one word long is a description nobody wrote. The
     * floor is deliberately low: the point is to catch an empty string or a
     * placeholder, not to grade the prose.
     */
    it.each(pages.map((path) => [path.replace(`${process.cwd()}/`, ''), path]))(
        '%s writes a description worth reading',
        (_name, path) => {
            const source = readFileSync(path, 'utf8');
            const literals = [...source.matchAll(/description="([^"]+)"/g)].map(
                (match) => match[1],
            );

            /* Some pages compute the description from props, which reads as
               `description={...}` and has no literal to measure. Those are
               covered by the `<PageMeta` check above. */
            for (const literal of literals) {
                expect(literal.length).toBeGreaterThan(20);
            }
        },
    );
});
