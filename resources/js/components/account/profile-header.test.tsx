import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ProfileHeader } from '@/components/account/profile-header';
import { PROFILE, PROFILE_STATS } from '@/fixtures/clover';

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

describe('ProfileHeader', () => {
    it('renders the handle as the only first-level heading', () => {
        render(<ProfileHeader profile={PROFILE} stats={PROFILE_STATS} />);

        const headings = screen.getAllByRole('heading', { level: 1 });

        expect(headings).toHaveLength(1);
        expect(headings[0]).toHaveTextContent('anon_4412');
    });

    it('renders the bio and the tripcode', () => {
        render(<ProfileHeader profile={PROFILE} stats={PROFILE_STATS} />);

        expect(screen.getByText(PROFILE.bio)).toBeInTheDocument();
        expect(screen.getByText('!!Xk29fLp2')).toBeInTheDocument();
    });

    it('marks a janitor and names the boards they janitor', () => {
        render(<ProfileHeader profile={PROFILE} stats={PROFILE_STATS} />);

        expect(screen.getByText('Janitor')).toBeInTheDocument();
        expect(
            screen.getByText('Joined 14 Mar 2024 · Janitor scope: /g/, /wg/'),
        ).toBeInTheDocument();
    });

    it('drops the janitor mark and the scope for an anon who janitors nothing', () => {
        render(
            <ProfileHeader
                profile={{ ...PROFILE, janitorScope: [] }}
                stats={PROFILE_STATS}
            />,
        );

        expect(screen.queryByText('Janitor')).not.toBeInTheDocument();
        expect(screen.getByText('Joined 14 Mar 2024')).toBeInTheDocument();
    });

    it('omits the tripcode when the anon never set one', () => {
        render(
            <ProfileHeader
                profile={{ ...PROFILE, tripcode: null }}
                stats={PROFILE_STATS}
            />,
        );

        expect(screen.queryByText('!!Xk29fLp2')).not.toBeInTheDocument();
    });

    it('points "Edit profile" at the real settings screen', () => {
        render(<ProfileHeader profile={PROFILE} stats={PROFILE_STATS} />);

        expect(
            screen.getByRole('link', { name: 'Edit profile' }),
        ).toHaveAttribute('href', '/settings/profile');
    });

    it('copies the profile link and says so when Share is pressed', async () => {
        const user = userEvent.setup();
        render(<ProfileHeader profile={PROFILE} stats={PROFILE_STATS} />);

        await user.click(screen.getByRole('button', { name: 'Share' }));

        expect(
            await screen.findByRole('button', { name: 'Link copied' }),
        ).toBeInTheDocument();
        await expect(navigator.clipboard.readText()).resolves.toBe(
            `${window.location.origin}/account`,
        );
    });

    it('renders every stat as a value beside its label', () => {
        render(<ProfileHeader profile={PROFILE} stats={PROFILE_STATS} />);

        for (const stat of PROFILE_STATS) {
            expect(screen.getByText(stat.label)).toBeInTheDocument();
            expect(screen.getByText(stat.value)).toBeInTheDocument();
        }
    });
});
