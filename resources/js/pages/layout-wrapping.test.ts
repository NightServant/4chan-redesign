import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * `app.tsx` resolves a layout for every page: `AppLayout` by default,
 * `AuthLayout` for `auth/*`, `[AppLayout, SettingsLayout]` for `settings/*`,
 * and none for `welcome`. A page that also renders `AppLayout` itself is
 * therefore wrapped twice, and renders two sidebars and two headers.
 *
 * Nothing catches this from a component test, because a test renders the page
 * alone and never involves `app.tsx`. It shipped on 22 pages across two tasks
 * before anyone opened one in a browser. This test is the cheap substitute for
 * that browser.
 */
const PAGES_ROOT = join(process.cwd(), 'resources/js/pages');

function collectPages(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);

        if (entry.isDirectory()) {
            return collectPages(path);
        }

        return /\.tsx$/.test(path) && !/\.test\.tsx$/.test(path) ? [path] : [];
    });
}

describe('page layout wrapping', () => {
    const pages = collectPages(PAGES_ROOT);

    it('finds pages to scan', () => {
        expect(pages.length).toBeGreaterThan(5);
    });

    it('never lets a page wrap itself in the layout app.tsx already applies', () => {
        const offenders = pages.filter((page) =>
            /from '@\/layouts\/app-layout'/.test(readFileSync(page, 'utf8')),
        );

        expect(
            offenders.map((page) => page.replace(process.cwd() + '/', '')),
            'app.tsx already wraps these; importing AppLayout here renders the chrome twice',
        ).toEqual([]);
    });
});
