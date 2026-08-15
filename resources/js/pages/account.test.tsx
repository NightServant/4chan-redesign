import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
    makeProfile,
    makeProfileComment,
    makeStat,
} from '@/fixtures/factories';
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
    /* The profile header mounts the edit dialog, which renders a `Form`. */
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

async function openTab(name: string) {
    const user = userEvent.setup();

    await user.click(screen.getByRole('tab', { name }));
}

/* Exactly what AccountController sends. Every figure is counted from this
   anon's own record, so a fresh account is legitimately all zeroes. */
const PROFILE = makeProfile({ tripcode: '!!Xk29fLp2' });

const STATS = [
    makeStat({ label: 'Posts', value: '2' }),
    makeStat({ label: 'Comments', value: '9' }),
    makeStat({ label: 'Reputation', value: '14' }),
    makeStat({ label: 'Bookmarks', value: '3' }),
];

const PROFILE_COMMENTS = [
    makeProfileComment({ body: 'Forty minutes for LLVM is not "fine".' }),
    makeProfileComment({ body: 'Mainline boots but the GPU does nothing.' }),
];

function accountProps() {
    return {
        profile: PROFILE,
        stats: STATS,
        comments: PROFILE_COMMENTS,
        media: [],
        saved: [],
    };
}

describe('Account', () => {
    it('has exactly one first-level heading, naming the anon', () => {
        render(<Account {...accountProps()} />);

        const headings = screen.getAllByRole('heading', { level: 1 });

        expect(headings).toHaveLength(1);
        expect(headings[0]).toHaveTextContent('anon_4412');
    });

    it('offers three profile tabs and no settings tab', () => {
        render(<Account {...accountProps()} />);

        const tablist = screen.getByRole('tablist');

        expect(
            within(tablist)
                .getAllByRole('tab')
                .map((tab) => tab.textContent),
        ).toEqual(['Comments', 'Media', 'Saved']);
    });

    it('opens on Comments, which is what an anon has here', () => {
        render(<Account {...accountProps()} />);

        expect(screen.getByRole('tab', { name: 'Comments' })).toHaveAttribute(
            'aria-selected',
            'true',
        );
    });

    /**
     * Overview and Posts are gone, and asserted as absences because every
     * other test here passes with them restored.
     *
     * Overview summarised the tabs beside it, and its "top thread" panel read
     * "No threads yet" on every account: Clover accepts no new threads, so
     * nobody has started one. Posts listed the same threads that panel was
     * empty about.
     */
    it('offers no tab that could only ever be empty', () => {
        render(<Account {...accountProps()} />);

        for (const name of ['Overview', 'Posts']) {
            expect(screen.queryByRole('tab', { name })).not.toBeInTheDocument();
        }

        expect(
            screen.queryByRole('region', { name: 'Recent activity' }),
        ).not.toBeInTheDocument();
        expect(screen.queryByText('No threads yet')).not.toBeInTheDocument();
    });

    it('shows four distinct replies under Comments', async () => {
        render(<Account {...accountProps()} />);

        await openTab('Comments');

        for (const comment of PROFILE_COMMENTS) {
            expect(screen.getByText(comment.body)).toBeInTheDocument();
        }
    });

    /**
     * An anon's own uploads. Clover accepts no files yet, so the honest state
     * is empty rather than attachments borrowed from threads they merely
     * read — which would claim they posted them.
     */
    it('says there is no media rather than borrowing someone else attachments', async () => {
        render(<Account {...accountProps()} />);

        await openTab('Media');

        expect(screen.getByText('No media yet')).toBeInTheDocument();
    });

    it('lists an attachment on the anon own post when there is one', async () => {
        render(
            <Account
                {...accountProps()}
                media={['x230.png · 1440x900 · 412 KB']}
            />,
        );

        await openTab('Media');

        expect(
            screen.getByRole('img', {
                name: 'Attachment: x230.png · 1440x900 · 412 KB',
            }),
        ).toBeInTheDocument();
    });

    it('shows an empty Saved tab pointing at the real bookmarks screen', async () => {
        render(<Account {...accountProps()} />);

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
        render(<Account {...accountProps()} />);

        screen.getByRole('tab', { name: 'Comments' }).focus();
        await user.keyboard('{ArrowRight}');

        expect(screen.getByRole('tab', { name: 'Media' })).toHaveAttribute(
            'aria-selected',
            'true',
        );
    });
});
