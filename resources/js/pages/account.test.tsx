import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PROFILE_COMMENTS, PROFILE_MEDIA } from '@/fixtures/clover';
import Account from '@/pages/account';

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    /* AccountOverview reads the sidebar's board list off the shared props. */
    usePage: () => ({ props: { sidebarBoards: [] } }),
    Link: ({
        href,
        children,
        ...props
    }: {
        href: string | { url: string };
        children: ReactNode;
    } & Record<string, unknown>) => {
        const url = typeof href === 'string' ? href : href.url;

        return (
            <a href={url} {...props}>
                {children}
            </a>
        );
    },
}));

async function openTab(name: string) {
    const user = userEvent.setup();

    await user.click(screen.getByRole('tab', { name }));
}

describe('Account', () => {
    it('has exactly one first-level heading, naming the anon', () => {
        render(<Account />);

        const headings = screen.getAllByRole('heading', { level: 1 });

        expect(headings).toHaveLength(1);
        expect(headings[0]).toHaveTextContent('anon_4412');
    });

    it('offers the five profile tabs and no settings tab', () => {
        render(<Account />);

        const tablist = screen.getByRole('tablist');

        expect(
            within(tablist)
                .getAllByRole('tab')
                .map((tab) => tab.textContent),
        ).toEqual(['Overview', 'Posts', 'Comments', 'Media', 'Saved']);
    });

    it('opens on Overview, showing recent activity', () => {
        render(<Account />);

        expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute(
            'aria-selected',
            'true',
        );
        expect(
            screen.getByRole('region', { name: 'Recent activity' }),
        ).toBeInTheDocument();
    });

    /**
     * The tab used to list ingested threads as though this anon had written
     * them, which was true of none of them: nothing attributes a post to an
     * anon until posting lands in task 11b. An empty state is the only honest
     * thing to show, and the tab keeps its place so the absence is visible
     * rather than the tab silently vanishing.
     */
    it('says there are no posts rather than listing threads nobody wrote', async () => {
        render(<Account />);

        await openTab('Posts');

        expect(screen.getByText('No posts yet')).toBeInTheDocument();
    });

    it('shows four distinct replies under Comments', async () => {
        render(<Account />);

        await openTab('Comments');

        for (const comment of PROFILE_COMMENTS) {
            expect(screen.getByText(comment.body)).toBeInTheDocument();
        }
    });

    it('shows every attachment as a named placeholder under Media', async () => {
        render(<Account />);

        await openTab('Media');

        for (const media of PROFILE_MEDIA) {
            expect(
                screen.getByRole('img', { name: `Attachment: ${media}` }),
            ).toBeInTheDocument();
        }
    });

    it('shows an empty Saved tab pointing at the real bookmarks screen', async () => {
        render(<Account />);

        await openTab('Saved');

        expect(
            screen.getByRole('heading', { name: 'Nothing saved yet' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Open bookmarks' }),
        ).toHaveAttribute('href', '/bookmarks');
    });

    it('moves between tabs from the keyboard', async () => {
        const user = userEvent.setup();
        render(<Account />);

        screen.getByRole('tab', { name: 'Overview' }).focus();
        await user.keyboard('{ArrowRight}');

        expect(screen.getByRole('tab', { name: 'Posts' })).toHaveAttribute(
            'aria-selected',
            'true',
        );
    });
});
