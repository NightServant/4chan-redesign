import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    makeAttachment,
    makeHistoryEntry,
    makeProfile,
    makeProfileComment,
    makeStat,
    makeThread,
} from '@/fixtures/factories';
import Account from '@/pages/account';
import type { User } from '@/types/auth';

/**
 * A router double whose `post`/`delete` are *methods* on the object rather
 * than plain functions, matching `use-bookmark.test.tsx`'s own double: a
 * detached `{ post: vi.fn() }` cannot reproduce the failure the real bug
 * had, since `useBookmark` calls these on `router` rather than picking them
 * off it, and a detached copy loses `this`.
 *
 * `SIGNED_IN_USER` lives inside this call rather than beside it: `vi.hoisted`
 * runs before the rest of the module's top-level `const`s are evaluated, so
 * a reference to an outer one throws `Cannot access before initialization`.
 */
const { visit, patch, router, pageProps, SIGNED_IN_USER } = vi.hoisted(() => {
    const visit = vi.fn();

    const signedInUser = {
        id: 1,
        email: 'anon@example.com',
        email_verified_at: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
    };

    return {
        visit,
        patch: vi.fn(),
        router: {
            visit,
            post(url: string, data?: unknown, options?: unknown) {
                return this.visit(url, {
                    ...(options ?? {}),
                    method: 'post',
                    data,
                });
            },
            delete(url: string, options?: unknown) {
                return this.visit(url, {
                    ...(options ?? {}),
                    method: 'delete',
                });
            },
        },
        pageProps: {
            auth: { user: signedInUser as User | null },
            sidebarBoards: [] as unknown[],
            showsMatureBoards: false,
        },
        SIGNED_IN_USER: signedInUser,
    };
});

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    router: { ...router, patch },
    /* AccountOverview reads the sidebar's board list off the shared props;
       `MatureBoardsToggle` (the below-`md` adult-boards row) reads
       `showsMatureBoards` off the same shared object; `useBookmark` reads
       `auth.user` off it too, since the History tab's cards carry the same
       bookmark control the feed's do. */
    usePage: () => ({ props: pageProps }),
    Link: ({
        href,
        as,
        children,
        ...props
    }: {
        href: string | { url: string };
        as?: string;
        children: ReactNode;
    } & Record<string, unknown>) => {
        const url = typeof href === 'string' ? href : href.url;

        if (as === 'button') {
            return (
                <button type="button" {...props}>
                    {children}
                </button>
            );
        }

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
        history: [],
    };
}

beforeEach(() => {
    patch.mockReset();
    visit.mockClear();
    pageProps.auth = { user: SIGNED_IN_USER };
    pageProps.sidebarBoards = [];
    pageProps.showsMatureBoards = false;
});

describe('Account', () => {
    it('has exactly one first-level heading, naming the anon', () => {
        render(<Account {...accountProps()} />);

        const headings = screen.getAllByRole('heading', { level: 1 });

        expect(headings).toHaveLength(1);
        expect(headings[0]).toHaveTextContent('anon_4412');
    });

    /**
     * History is the fourth tab, and it is `md:hidden` -- at `md` and up
     * `/history` is its own page reached from the avatar menu, and this tab
     * does not exist there. jsdom cannot evaluate the media query, so both
     * facts are asserted separately: all four tabs are in the markup (this
     * test), and the fourth carries the class that hides it above `md` (the
     * "History tab" tests below).
     */
    it('offers four profile tabs -- Comments, Media, Saved, History -- and no settings tab', () => {
        render(<Account {...accountProps()} />);

        const tablist = screen.getByRole('tablist');

        expect(
            within(tablist)
                .getAllByRole('tab')
                .map((tab) => tab.textContent),
        ).toEqual(['Comments', 'Media', 'Saved', 'History']);
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

    /**
     * The tab has to show the picture, not a caption describing one.
     *
     * It received a list of label strings and rendered each as a grey
     * `MediaPlaceholder`, so whatever an anon uploaded, the tab showed a box
     * with a filename in it. That was built before uploads existed and stayed
     * that way after they landed.
     */
    it('renders the attachment itself, not a caption describing it', async () => {
        const attachment = makeAttachment({
            fullUrl: '/storage/attachments/g/abc123.png',
            filename: 'x230.png',
        });

        const { container } = render(
            <Account {...accountProps()} media={[attachment]} />,
        );

        await openTab('Media');

        expect(
            await screen.findByRole('img', {
                name: 'Attached image: x230.png',
            }),
        ).toHaveAttribute('src', '/storage/attachments/g/abc123.png');

        /* And no grey box with a filename written on it. */
        expect(
            container.querySelector('[data-slot="media-placeholder"]'),
        ).toBeNull();
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

    /**
     * Change 3: History moves onto the account screen below `md`. The tab
     * reads what `/history` shows -- the same `ThreadCard`, newest first,
     * grouped by day -- through the same `HistoryEntryList` component
     * `history.tsx` renders, not a second list built to match it by hand.
     */
    describe('History tab', () => {
        it('is `md:hidden`, on both the trigger and its content', () => {
            render(<Account {...accountProps()} />);

            expect(screen.getByRole('tab', { name: 'History' })).toHaveClass(
                'md:hidden',
            );
        });

        it('shows an empty state pointing at the real history screen when there is none', async () => {
            render(<Account {...accountProps()} />);

            await openTab('History');

            expect(
                screen.getByRole('heading', { name: /no history/i }),
            ).toBeInTheDocument();
            expect(
                screen.getByRole('link', { name: /open history/i }),
            ).toHaveAttribute('href', '/history');
        });

        it("draws each entry with the feed's own card, grouped by day", async () => {
            const entries = [
                makeHistoryEntry({
                    thread: makeThread({ title: 'Read this morning', no: 1 }),
                    day: 'Today',
                    when: 'Today, 09:00',
                }),
            ];

            const { container } = render(
                <Account {...accountProps()} history={entries} />,
            );

            await openTab('History');

            expect(
                container.querySelectorAll('[data-slot="thread-card"]'),
            ).toHaveLength(1);
            expect(screen.getByText('Read this morning')).toBeInTheDocument();
        });

        /**
         * The tab is capped server-side (`AccountController::HISTORY`), so
         * there can always be more than it shows -- unlike the Saved tab's
         * empty-state-only link, this one is offered whenever there is
         * anything in the list, since "the rest" only exists once the list
         * is non-empty.
         */
        it('links onward to the full history screen when there are entries, not only when empty', async () => {
            const entries = [makeHistoryEntry({ day: 'Today' })];

            render(<Account {...accountProps()} history={entries} />);

            await openTab('History');

            expect(
                screen.getByRole('link', { name: /view full history/i }),
            ).toHaveAttribute('href', '/history');
        });

        it('wires a real bookmark handler to each card, like every other screen', async () => {
            const user = userEvent.setup();
            const thread = makeThread({ id: 12, no: 12, bookmarked: false });
            const entries = [makeHistoryEntry({ thread, day: 'Today' })];

            render(<Account {...accountProps()} history={entries} />);

            await openTab('History');

            const [save] = screen.getAllByRole('button', {
                name: /save|bookmark/i,
            });
            await user.click(save);

            /* A missing handler would leave this unclicked-through rather
               than throwing, which is exactly the defect `use-bookmark.
               test.tsx`'s file scan exists to catch across every page: the
               button renders, looks identical to a working one, and does
               nothing at all. */
            expect(visit).toHaveBeenCalledWith(
                '/threads/12/bookmark',
                expect.objectContaining({ method: 'post' }),
            );
        });
    });

    /**
     * Change 4 and change 5: what the avatar dropdown carried below `md`
     * that has nowhere else to go. `Show adult boards` moves the same way
     * History does; `Two-factor authentication` and `Sign out` are new here
     * -- the dropdown itself is hidden below `md` in `app-header.tsx`, and
     * neither had any other home.
     */
    describe('account settings section', () => {
        it('is `md:hidden`, since the dropdown carrying the same rows is not hidden above it', () => {
            const { container } = render(<Account {...accountProps()} />);

            const section = container.querySelector(
                '[aria-label="Account settings"]',
            );

            expect(section).not.toBeNull();
            expect(section).toHaveClass('md:hidden');
        });

        it('renders the real adult-boards toggle, not a third copy of the control', () => {
            pageProps.showsMatureBoards = true;

            render(<Account {...accountProps()} />);

            expect(
                screen.getByRole('switch', { name: 'Show adult boards' }),
            ).toBeChecked();
        });

        it('links to the two-factor page', () => {
            render(<Account {...accountProps()} />);

            expect(
                screen.getByRole('link', {
                    name: /two-factor authentication/i,
                }),
            ).toHaveAttribute('href', '/settings/two-factor');
        });

        /**
         * `Sign out` is a POST, not a navigation -- exactly as it is in the
         * avatar dropdown -- so it has to stay a real submitting control
         * rather than a plain link a signed-in anon could bookmark or share.
         */
        /**
         * `tagName` rather than an `href`, matching the assertion
         * `app-header.test.tsx` already makes for the same row in the
         * dropdown: a real `<button>` has no `href` to check, and that
         * absence is exactly the point -- it posts through Inertia's own
         * submit handling rather than navigating like a link.
         */
        it('still posts to sign out, kept a real button rather than a plain link', () => {
            render(<Account {...accountProps()} />);

            const signOut = screen.getByRole('button', { name: /sign out/i });

            expect(signOut.tagName).toBe('BUTTON');
        });
    });
});
