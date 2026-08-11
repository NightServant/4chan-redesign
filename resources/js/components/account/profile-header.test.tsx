import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ProfileHeader } from '@/components/account/profile-header';
import { makeProfile, makeStat } from '@/fixtures/factories';

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

const PROFILE = makeProfile({ tripcode: '!!Xk29fLp2' });

const PROFILE_STATS = [
    makeStat({ label: 'Posts', value: '412' }),
    makeStat({ label: 'Comments', value: '3,908' }),
    makeStat({ label: 'Reputation', value: '11,204' }),
    makeStat({ label: 'Bookmarks', value: '96' }),
];

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

    /**
     * Janitor scope named a moderation system that does not exist — no report
     * queue, no janitor role, nothing to be in scope of. The badge and the
     * second half of the meta line went with it.
     */
    it('shows the join date alone, with no janitor claim', () => {
        render(<ProfileHeader profile={PROFILE} stats={PROFILE_STATS} />);

        expect(screen.getByText('Joined 14 Mar 2024')).toBeInTheDocument();
        expect(screen.queryByText('Janitor')).not.toBeInTheDocument();
        expect(screen.queryByText(/Janitor scope/)).not.toBeInTheDocument();
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
