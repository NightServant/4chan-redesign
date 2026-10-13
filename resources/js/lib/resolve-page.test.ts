import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolvePage } from '@/lib/resolve-page';

const pagesDirectory = resolve(import.meta.dirname, '../pages');

/**
 * Every page on disk, as the name the server sends: `auth/login`, not
 * `auth/login.tsx`. The test files that sit beside them are not pages.
 */
const pageNames = readdirSync(pagesDirectory, {
    recursive: true,
    encoding: 'utf8',
})
    .filter((file) => file.endsWith('.tsx') && !file.endsWith('.test.tsx'))
    .map((file) => file.replace(/\.tsx$/, ''));

/**
 * The resolver is the one place that decides which files under `pages/` become
 * chunks in the production build. When it matched everything, twenty-three
 * `*.test` chunks (a testing library among them) shipped to `public/build`.
 */
describe('resolvePage', () => {
    it('finds pages to resolve', () => {
        expect(pageNames.length).toBeGreaterThan(20);
    });

    it.each(pageNames)('resolves %s to a component', async (name) => {
        expect(await resolvePage(name)).toBeTruthy();
    });

    it('does not resolve a test file as a page', async () => {
        await expect(resolvePage('welcome.test')).rejects.toThrow(
            'Page not found: welcome.test',
        );
    });

    it('rejects a page that does not exist', async () => {
        await expect(resolvePage('no-such-page')).rejects.toThrow(
            'Page not found: no-such-page',
        );
    });
});
