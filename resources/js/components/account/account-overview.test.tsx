import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AccountOverview } from '@/components/account/account-overview';
import { ACHIEVEMENTS, ACTIVITY, BOARDS, THREADS } from '@/fixtures/clover';

vi.mock('@inertiajs/react', () => ({
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

describe('AccountOverview', () => {
    it('lists every recent activity entry with its time', () => {
        render(<AccountOverview />);

        const region = screen.getByRole('region', { name: 'Recent activity' });

        for (const entry of ACTIVITY) {
            expect(within(region).getByText(entry.text)).toBeInTheDocument();
            expect(within(region).getByText(entry.time)).toBeInTheDocument();
        }
    });

    it('lists every achievement with its meta line', () => {
        render(<AccountOverview />);

        const region = screen.getByRole('region', { name: 'Achievements' });

        for (const achievement of ACHIEVEMENTS) {
            expect(
                within(region).getByText(achievement.title),
            ).toBeInTheDocument();
            expect(
                within(region).getByText(achievement.meta),
            ).toBeInTheDocument();
        }
    });

    it('shows the top thread', () => {
        render(<AccountOverview />);

        const region = screen.getByRole('region', { name: 'Top thread' });

        expect(
            within(region).getByRole('link', { name: THREADS[4].title }),
        ).toBeInTheDocument();
    });

    it('links one button per board at that board', () => {
        render(<AccountOverview />);

        const region = screen.getByRole('region', { name: 'Boards' });

        for (const board of BOARDS) {
            expect(
                within(region).getByRole('link', { name: board.slug }),
            ).toHaveAttribute('href', `/${board.slug.replaceAll('/', '')}`);
        }
    });

    it('links the boards action at the directory', () => {
        render(<AccountOverview />);

        expect(screen.getByRole('link', { name: 'Manage' })).toHaveAttribute(
            'href',
            '/communities',
        );
    });
});
