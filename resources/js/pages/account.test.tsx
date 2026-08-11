import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PROFILE_COMMENTS, PROFILE_MEDIA, THREADS } from '@/fixtures/clover';
import Account from '@/pages/account';

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
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

    it('shows three of the threads this anon opened under Posts', async () => {
        render(<Account />);

        await openTab('Posts');

        for (const thread of THREADS.slice(0, 3)) {
            expect(
                screen.getByRole('link', { name: thread.title }),
            ).toBeInTheDocument();
        }

        expect(
            screen.queryByRole('link', { name: THREADS[4].title }),
        ).not.toBeInTheDocument();
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
