import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeDirectoryEntry } from '@/fixtures/factories';
import Communities from '@/pages/communities';

const { pageProps } = vi.hoisted(() => ({
    pageProps: { showsMatureBoards: false, sidebarBoards: [] },
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

/**
 * Every link on the page except the one inside the hidden-boards notice.
 *
 * This used to keep only hrefs shaped like `/g`, on the reasoning that the
 * settings link was longer. It was, at `/settings/profile` — and then settings
 * merged onto `/settings`, which matches that shape exactly, and the notice's
 * link started counting as a board. Excluding the notice by where it sits says
 * what was actually meant and cannot be broken by a route being shortened.
 */
function boardHrefs(): string[] {
    return screen
        .getAllByRole('link')
        .filter((link) => link.closest('[data-slot="mature-notice"]') === null)
        .map((link) => link.getAttribute('href') ?? '');
}

/* What the server sends an anon who has not opted in: worksafe boards only.
   The page no longer filters, so this is the whole prop rather than a subset
   of a longer list the browser also received. */
const WORKSAFE = [
    makeDirectoryEntry({ slug: '/g/', name: 'Technology' }),
    makeDirectoryEntry({
        slug: '/wg/',
        name: 'Wallpapers',
        category: 'Creative',
    }),
    makeDirectoryEntry({ slug: '/biz/', name: 'Business' }),
];

/* And what it sends once they have: the same list plus the hidden ones. */
const WITH_MATURE = [
    ...WORKSAFE,
    makeDirectoryEntry({
        slug: '/b/',
        name: 'Random',
        category: 'Misc',
        worksafe: false,
    }),
];

describe('Communities page', () => {
    beforeEach(() => {
        pageProps.showsMatureBoards = false;
    });

    /** Shell-wide, like the account screen and the chrome above both. */
    it('is measured against the shell', () => {
        const { container } = render(
            <Communities boards={WORKSAFE} hiddenCount={1} />,
        );

        expect(container.querySelector('div')?.className).toContain(
            'max-w-(--measure-shell)',
        );
    });

    it('renders the directory under a single page heading', () => {
        render(<Communities boards={WORKSAFE} hiddenCount={1} />);

        expect(
            screen.getByRole('heading', { level: 1, name: 'Communities' }),
        ).toBeInTheDocument();
        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    });

    /**
     * The whole page is links, so a slug the router does not accept would be a
     * dead end on the one screen whose entire job is getting anons to boards.
     * Both lists come from the `boards` table now, so they cannot disagree
     * about which boards exist; `BoardCatalogueTest` guards that end of it.
     */
    it('links every board it is given, and nothing else', () => {
        render(<Communities boards={WITH_MATURE} hiddenCount={0} />);

        const hrefs = boardHrefs();

        expect(hrefs).toHaveLength(WITH_MATURE.length);
        expect(hrefs).toEqual(
            expect.arrayContaining(['/g', '/wg', '/biz', '/b']),
        );
    });

    /**
     * The page draws what it is sent. Hidden boards are filtered by the query,
     * so the browser never receives one — which is the point: a board an anon
     * has asked not to see is absent, not merely undrawn.
     */
    it('renders no board it was not given', () => {
        render(<Communities boards={WORKSAFE} hiddenCount={1} />);

        expect(boardHrefs()).toHaveLength(WORKSAFE.length);
        expect(boardHrefs()).not.toContain('/b');
        expect(screen.queryByText('Random')).not.toBeInTheDocument();
    });

    /**
     * `/communities` is public, so the signed-out case is the common one, not
     * an edge case. The notice keeps the setting discoverable, from a count
     * the server supplies rather than from boards the client should not hold.
     */
    it('tells a filtered visitor how much is hidden', () => {
        render(<Communities boards={WORKSAFE} hiddenCount={24} />);

        expect(
            screen.getByText(/24 boards hidden by your content settings/i),
        ).toBeInTheDocument();
    });
});
