import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ProfileHeader } from '@/components/account/profile-header';
import { makeProfile, makeStat } from '@/fixtures/factories';

/**
 * The header now mounts the edit dialog, which renders an Inertia `Form`. The
 * mock supplies one so the dialog's contents stay observable without a server.
 */
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
    Form: ({
        children,
        action,
        method,
    }: {
        children: (state: {
            processing: boolean;
            errors: Record<string, string>;
        }) => ReactNode;
        action?: string;
        method?: string;
    } & Record<string, unknown>) => (
        <form action={action} method={method}>
            {children({ processing: false, errors: {} })}
        </form>
    ),
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

    /**
     * "Edit profile" opens a dialog over the profile rather than navigating to
     * settings. It used to link at the settings form, which edits the account's
     * name and email — neither of which this header shows — so the one button
     * promising to change what a reader was looking at changed nothing they
     * could see.
     */
    it('opens an edit dialog rather than navigating to settings', async () => {
        const user = userEvent.setup();
        render(<ProfileHeader profile={PROFILE} stats={PROFILE_STATS} />);

        expect(
            screen.queryByRole('link', { name: 'Edit profile' }),
        ).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Edit profile' }));

        const dialog = await screen.findByRole('dialog');

        expect(dialog).toBeInTheDocument();
    });

    /**
     * The two fields the profile actually displays, and only those. Seeded from
     * what is stored: an anon with no handle must get an empty box, not the
     * `anon_41` fallback they would then save as a real, taken handle.
     */
    it('edits the heading and the line under it, seeded from what is stored', async () => {
        const user = userEvent.setup();
        render(<ProfileHeader profile={PROFILE} stats={PROFILE_STATS} />);

        await user.click(screen.getByRole('button', { name: 'Edit profile' }));

        expect(await screen.findByLabelText('Username')).toHaveValue(
            'anon_4412',
        );
        expect(screen.getByLabelText('Bio')).toHaveValue('Reads /g/ at 3am.');
        expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
    });

    it('leaves the username box empty for an anon who has set none', async () => {
        const user = userEvent.setup();
        render(
            <ProfileHeader
                profile={makeProfile({ handle: 'anon_41', storedHandle: null })}
                stats={PROFILE_STATS}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'Edit profile' }));

        expect(await screen.findByLabelText('Username')).toHaveValue('');
    });

    /**
     * Share copied a link to `/account`, which resolves to whoever is signed
     * in — so the "shared" link showed the recipient their own profile, never
     * the sender's. Asserted as an absence so it does not come back.
     */
    it('offers no share control, which could only ever send the wrong link', () => {
        render(<ProfileHeader profile={PROFILE} stats={PROFILE_STATS} />);

        expect(
            screen.queryByRole('button', { name: /share/i }),
        ).not.toBeInTheDocument();
    });

    it('renders every stat as a value beside its label', () => {
        render(<ProfileHeader profile={PROFILE} stats={PROFILE_STATS} />);

        for (const stat of PROFILE_STATS) {
            expect(screen.getByText(stat.label)).toBeInTheDocument();
            expect(screen.getByText(stat.value)).toBeInTheDocument();
        }
    });
});
