import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BOARD_DIRECTORY } from '@/fixtures/clover';
import Communities from '@/pages/communities';

const { pageProps } = vi.hoisted(() => ({
    pageProps: { showsMatureBoards: false },
}));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    usePage: () => ({ props: pageProps }),
    Link: ({
        href,
        children,
        ...props
    }: {
        href: string | { url: string };
        children: ReactNode;
    } & Record<string, unknown>) => (
        <a href={typeof href === 'string' ? href : href.url} {...props}>
            {children}
        </a>
    ),
}));

/** Board links look like `/g`; the settings link in the notice does not. */
function boardHrefs(): string[] {
    return screen
        .getAllByRole('link')
        .map((link) => link.getAttribute('href') ?? '')
        .filter((href) => /^\/[a-z]+$/.test(href));
}

const worksafe = BOARD_DIRECTORY.filter((entry) => entry.worksafe);

describe('Communities page', () => {
    beforeEach(() => {
        pageProps.showsMatureBoards = false;
    });

    it('renders the directory under a single page heading', () => {
        render(<Communities />);

        expect(
            screen.getByRole('heading', { level: 1, name: 'Communities' }),
        ).toBeInTheDocument();
        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    });

    /**
     * The whole page is links, so a slug the router does not accept would be a
     * dead end on the one screen whose entire job is getting anons to boards.
     * `config/clover.php` is the list; this mirrors it deliberately, so adding
     * a board to the fixture without routing it fails here.
     */
    it('links only slugs the router accepts', () => {
        pageProps.showsMatureBoards = true;
        render(<Communities />);

        const routable = ['/g', '/wg', '/biz', '/x', '/fit', '/co', '/b'];
        const hrefs = boardHrefs();

        expect(hrefs).toHaveLength(BOARD_DIRECTORY.length);
        expect(hrefs.every((href) => routable.includes(href))).toBe(true);
    });

    it('hides adult boards from an anon who has not opted in', () => {
        render(<Communities />);

        expect(boardHrefs()).toHaveLength(worksafe.length);
        expect(boardHrefs()).not.toContain('/b');
    });

    /**
     * `/communities` is public, so the signed-out case is the common one, not
     * an edge case. It resolves to the filtered view without the page having
     * to ask whether anyone is signed in.
     */
    it('defaults a signed-out visitor to the filtered view', () => {
        render(<Communities />);

        expect(
            screen.getByText(/hidden by your content settings/i),
        ).toBeInTheDocument();
    });
});
