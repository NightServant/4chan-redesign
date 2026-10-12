import type { ResolvedComponent } from '@inertiajs/react';

/**
 * The pages, and only the pages.
 *
 * `@inertiajs/vite` writes this resolver itself when `createInertiaApp` is not
 * given one, and its glob takes every `.tsx` under `pages/`. Every
 * `*.test.tsx` beside a page matched it, so each test file became a lazy chunk of the production
 * build, and the testing library they import became a 436 kB chunk of its own.
 * None of it was ever requested, and all of it was deployed.
 *
 * The negative pattern is what keeps them out. `resolve-page.test.ts` pins it.
 */
const pages = import.meta.glob<{ default: ResolvedComponent }>([
    '../pages/**/*.tsx',
    '!../pages/**/*.test.tsx',
]);

export async function resolvePage(name: string): Promise<ResolvedComponent> {
    const load = pages[`../pages/${name}.tsx`];

    if (!load) {
        throw new Error(`Page not found: ${name}`);
    }

    return (await load()).default;
}
