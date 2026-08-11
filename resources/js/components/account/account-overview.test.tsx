import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AccountOverview } from '@/components/account/account-overview';
import { makeActivity, makeBoard } from '@/fixtures/factories';

/**
 * The board list comes from the shared prop the sidebar also reads, so the
 * double has to supply it. Two boards is enough to prove one button per board
 * without the assertion depending on how many the server chose to send.
 */
const BOARDS = [
    makeBoard({ slug: '/g/', name: 'Technology' }),
    makeBoard({ slug: '/biz/', name: 'Business' }),
];

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { sidebarBoards: BOARDS } }),
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

const ACTIVITY = [
    makeActivity({ text: 'You replied in /g/', time: '2 min ago' }),
    makeActivity({
        icon: 'bookmark',
        text: 'You saved a thread in /x/',
        time: '1 hr ago',
    }),
];

describe('AccountOverview', () => {
    it('lists every recent activity entry with its time', () => {
        render(<AccountOverview activity={ACTIVITY} />);

        const region = screen.getByRole('region', { name: 'Recent activity' });

        for (const entry of ACTIVITY) {
            expect(within(region).getByText(entry.text)).toBeInTheDocument();
            expect(within(region).getByText(entry.time)).toBeInTheDocument();
        }
    });

    /**
     * The panel is gone. Its badges were fixture claims every account
     * displayed identically, and computing them honestly would leave an empty
     * panel on any real account for a very long time — a badge for something
     * nothing measures is the same defect as an online count with no source.
     */
    it('has no achievements panel', () => {
        render(<AccountOverview activity={ACTIVITY} />);

        expect(
            screen.queryByRole('region', { name: 'Achievements' }),
        ).not.toBeInTheDocument();
    });

    /**
     * It used to render a fixture thread as this anon's best. Nothing
     * attributes a post to an anon yet — authorship arrives with posting in
     * task 11b — so the card claimed they had written something they had not.
     */
    it('says there is no top thread rather than showing one nobody wrote', () => {
        render(<AccountOverview activity={ACTIVITY} />);

        const region = screen.getByRole('region', { name: 'Top thread' });

        expect(within(region).getByText('No threads yet')).toBeInTheDocument();
        expect(within(region).queryByRole('link')).not.toBeInTheDocument();
    });

    it('links one button per board at that board', () => {
        render(<AccountOverview activity={ACTIVITY} />);

        const region = screen.getByRole('region', { name: 'Boards' });

        for (const board of BOARDS) {
            expect(
                within(region).getByRole('link', { name: board.slug }),
            ).toHaveAttribute('href', `/${board.slug.replaceAll('/', '')}`);
        }
    });

    it('links the boards action at the directory', () => {
        render(<AccountOverview activity={ACTIVITY} />);

        expect(screen.getByRole('link', { name: 'Manage' })).toHaveAttribute(
            'href',
            '/communities',
        );
    });
});
