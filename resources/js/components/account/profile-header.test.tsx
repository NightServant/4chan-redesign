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
    /**
     * A bio is whatever an anon typed, and an anon can type
     * "HAHAHAHAHAHAHAHAHAHAHAHA" with no space in it. Without a wrapping rule
     * a single long word does not wrap: it runs straight out of its column and
     * past the edge of the block, which is what the account screen was doing
     * at 320px.
     */
    it('wraps a bio with no spaces in it rather than letting it escape', () => {
        render(
            <ProfileHeader
                profile={makeProfile({
                    bio: 'HAHAHAHAHAHAHAHAHAHAHAHAHAHAHAHAHAHAHA',
                })}
                stats={PROFILE_STATS}
            />,
        );

        expect(
            screen.getByText('HAHAHAHAHAHAHAHAHAHAHAHAHAHAHAHAHAHAHA'),
        ).toHaveClass('break-words');
    });

    /**
     * No box below `md`.
     *
     * A bordered block at the top of a page built on hairlines is a card
     * inside a card, and on a phone it spends its two side borders on nothing.
     * The border returns at `md`, where the block sits in a wider measure and
     * reads as a panel rather than as the page.
     */
    it('draws its border only at `md` and up', () => {
        const { container } = render(
            <ProfileHeader profile={PROFILE} stats={PROFILE_STATS} />,
        );

        const block = container.querySelector('[data-slot="profile-header"]');

        expect(block).toHaveClass('md:border');
        expect(block?.className).not.toMatch(/(^|\s)border(\s|$)/);
    });

    /**
     * The figures sit on one line at every width.
     *
     * They were a `flex-wrap` row with `basis-40` — 160px — so at 320px each
     * figure claimed more than half the row and all three stacked, spending
     * roughly 250px before the tabs. Narrowing the basis only moved the
     * problem: at around 340px two sat up and the third dropped below them,
     * which reads as a mistake rather than a layout. A grid cannot wrap.
     */
    it('lays the figures out as a grid, so they never wrap', () => {
        const { container } = render(
            <ProfileHeader profile={PROFILE} stats={PROFILE_STATS} />,
        );

        const list = container.querySelector('dl');

        expect(list).toHaveClass('grid');
        expect(list?.className).not.toMatch(/flex-wrap/);
        expect(list?.querySelectorAll(':scope > div')).toHaveLength(
            PROFILE_STATS.length,
        );
    });

    /**
     * Nothing shares the identity line with the chip.
     *
     * Avatar, handle and "Edit profile" were one `flex-wrap` row, and the
     * chip does not shrink — so between roughly 340px and 440px it held the
     * first line, the text column collapsed, the handle ran underneath the
     * chip and the bio broke mid-word. The chip gets its own row now, and so
     * does the bio.
     */
    it('keeps the chip out of the row the handle is on', () => {
        const { container } = render(
            <ProfileHeader profile={PROFILE} stats={PROFILE_STATS} />,
        );

        const heading = screen.getByRole('heading', { level: 1 });
        const chip = screen.getByRole('button', { name: 'Edit profile' });

        const headingRow = heading.closest('div')?.parentElement;

        expect(headingRow?.contains(chip)).toBe(false);
        expect(container.querySelector('[data-slot="profile-header"]')).toBe(
            container.firstElementChild,
        );
    });
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

    /**
     * The block used to open with a 132px empty band — a cover area for an
     * image Clover has never had and never will — with a ruled overlay drawn
     * over it that belonged to no other screen on the site.
     *
     * Asserted as absences, because a header that merely looks different in a
     * screenshot is a header somebody can put back by accident.
     */
    it('carries no cover band and no second pattern system', () => {
        const { container } = render(
            <ProfileHeader profile={PROFILE} stats={PROFILE_STATS} />,
        );

        expect(container.querySelector('[data-slot="card"]')).toBeNull();
        expect(container.innerHTML).not.toContain('repeating-linear-gradient');
        expect(container.innerHTML).not.toContain('h-[132px]');
    });

    /** The same paper every band on the site sits on. */
    it('is drawn on the site pattern rather than a slab of its own', () => {
        const { container } = render(
            <ProfileHeader profile={PROFILE} stats={PROFILE_STATS} />,
        );

        expect(
            container.querySelector('[data-slot="pattern-field-paper"]')
                ?.className,
        ).toMatch(/bg-dots/);
    });

    it('names itself as a region so the page has a labelled top', () => {
        render(<ProfileHeader profile={PROFILE} stats={PROFILE_STATS} />);

        expect(
            screen.getByRole('region', { name: 'Profile' }),
        ).toBeInTheDocument();
    });

    /** An anon who has written no bio gets no empty paragraph. */
    it('omits the bio when there is none', () => {
        render(
            <ProfileHeader
                profile={makeProfile({ bio: '' })}
                stats={PROFILE_STATS}
            />,
        );

        expect(screen.queryByText(PROFILE.bio)).not.toBeInTheDocument();
    });
});
