import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeComment, makeThread } from '@/fixtures/factories';
import Thread from '@/pages/thread';
import type { User } from '@/types/auth';

/**
 * `usePage`/`Link`/`Head` need a real Inertia app context this test does not
 * have. Mirrors the double `app-sidebar.test.tsx` and `feed.test.tsx` use.
 *
 * `thread/reply-composer` and `clover/auth-gate` are owned by other Task 8
 * workers and may not exist on disk yet when this file is written. Both are
 * mocked to their documented contract (`worker-a-brief.md`), the same way
 * `feed.test.tsx` mocked `feed/rail` before it existed.
 */
const { usePage } = vi.hoisted(() => ({
    usePage: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({
    usePage,
    router: { post: vi.fn(), delete: vi.fn(), visit: vi.fn() },
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

vi.mock('@/components/thread/reply-composer', () => ({
    /* Reports the two props the page now drives, so a test can see a quote
       or a server error actually reach the composer rather than only that
       the composer is on the page. */
    ReplyComposer: ({
        threadNo,
        error,
        onReady,
    }: {
        threadNo: number;
        onReply: (body: string) => void;
        error?: string;
        onReady?: (api: { quote: (no: number) => void }) => void;
    }) => {
        const [quoted, setQuoted] = useState('');

        /* The real composer registers the same way. A double that skipped
           registration would make the page's Reply wiring untestable, which
           is how the control stayed dead for so long. */
        useEffect(() => {
            onReady?.({ quote: (no) => setQuoted(String(no)) });
        }, [onReady]);

        return (
            <div
                data-testid="reply-composer-stub"
                data-thread-no={threadNo}
                data-quote={quoted}
                data-error={error ?? ''}
            />
        );
    },
}));

vi.mock('@/components/clover/auth-gate', () => ({
    AuthGate: ({
        action,
        open,
    }: {
        action: string;
        open: boolean;
        onOpenChange: (open: boolean) => void;
    }) => (open ? <div data-testid="auth-gate-stub">{action}</div> : null),
}));

const SIGNED_IN_USER: User = {
    id: 1,
    email: 'anon@example.com',
    email_verified_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
};

const KNOWN_THREAD = makeThread({
    no: 58210441,
    board: '/g/',
    title: 'Anons are still arguing about init systems',
    excerpt: 'Compiling LLVM takes 40 minutes but everything else is fine.',
    replies: 318,
});

/* Nested server-side from the flat post list 4chan returns; the page renders
   the tree it is handed and does no nesting of its own. */
const COMMENTS = [
    makeComment({
        body: 'Forty minutes for LLVM is not "fine", that is a full coffee break per build.',
        replies: [
            makeComment({
                body: 'Eight cores, 16 GB. It is not fast, it is usable.',
                op: true,
            }),
        ],
    }),
    makeComment({ body: 'Mainline kernel support or vendor tree?' }),
];

/**
 * `useIsMobile` reads `matchMedia`, which jsdom does not implement. These
 * tests set the answer per case, because below `md` the thread page offers a
 * link to the composer page and at `md` and up it offers the inline composer
 * -- two different things, not one restyled, so the branch has to be exercised
 * both ways.
 */
function setViewport(isMobile: boolean): void {
    vi.stubGlobal('matchMedia', (query: string) => ({
        matches: isMobile,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }));
}

/**
 * `errors` is shared by Inertia on every response, empty when there is
 * nothing wrong. The double left it out, which is the shape of double that
 * hides a bug: the page now reads it to show the server's rejection against
 * the composer, and a mock missing it would have made that read look
 * impossible rather than untested.
 */
function mockPage({
    signedIn = false,
    errors = {},
}: { signedIn?: boolean; errors?: Record<string, string> } = {}) {
    usePage.mockReturnValue({
        url: `/g/${KNOWN_THREAD.no}`,
        props: { auth: { user: signedIn ? SIGNED_IN_USER : null }, errors },
    });
}

beforeEach(() => {
    mockPage();
    setViewport(false);
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('Thread', () => {
    it('renders the known thread title as the only h1', () => {
        render(
            <Thread
                slug="/g/"
                no={KNOWN_THREAD.no}
                thread={KNOWN_THREAD}
                comments={COMMENTS}
                maxCommentChars={2000}
            />,
        );

        const headings = screen.getAllByRole('heading', { level: 1 });
        expect(headings).toHaveLength(1);
        expect(headings[0]).toHaveTextContent(KNOWN_THREAD.title);
    });

    it('renders the thread\'s post number in ">>" form', () => {
        render(
            <Thread
                slug="/g/"
                no={KNOWN_THREAD.no}
                thread={KNOWN_THREAD}
                comments={COMMENTS}
                maxCommentChars={2000}
            />,
        );

        expect(screen.getByText(`>>${KNOWN_THREAD.no}`)).toBeInTheDocument();
    });

    /**
     * No "Back to /g/" link.
     *
     * The board is named twice within an inch of it -- in the post's own
     * header row, which links to the same place, and in the sidebar's board
     * list. A third copy pointing at the same board was one row of chrome
     * repeating what the content underneath already says.
     */
    it('offers no separate back link, since the post header names the board', () => {
        render(
            <Thread
                slug="/g/"
                no={KNOWN_THREAD.no}
                thread={KNOWN_THREAD}
                comments={COMMENTS}
                maxCommentChars={2000}
            />,
        );

        expect(
            screen.queryByRole('link', { name: /back to/i }),
        ).not.toBeInTheDocument();
        expect(
            screen.getAllByRole('link', { name: /\/g\// })[0],
        ).toHaveAttribute('href', '/g');
    });

    it('renders the reply count label matching the fixture, with the number in a MachineValue', () => {
        render(
            <Thread
                slug="/g/"
                no={KNOWN_THREAD.no}
                thread={KNOWN_THREAD}
                comments={COMMENTS}
                maxCommentChars={2000}
            />,
        );

        const sectionLabels = document.querySelectorAll(
            '[data-slot="section-label"]',
        );
        const repliesLabel = Array.from(sectionLabels).find((node) =>
            node.textContent?.includes('replies'),
        );
        expect(repliesLabel?.textContent).toBe(
            `${KNOWN_THREAD.replies} replies`,
        );

        const machineValue = repliesLabel?.querySelector(
            '[data-slot="machine-value"]',
        );
        expect(machineValue?.textContent).toBe(String(KNOWN_THREAD.replies));
    });

    it('renders the comment tree for a known thread', () => {
        render(
            <Thread
                slug="/g/"
                no={KNOWN_THREAD.no}
                thread={KNOWN_THREAD}
                comments={COMMENTS}
                maxCommentChars={2000}
            />,
        );

        expect(
            screen.getByRole('list', { name: 'Replies' }),
        ).toBeInTheDocument();
        expect(screen.getByText(COMMENTS[0].body)).toBeInTheDocument();
    });

    it('shows the composer to a signed-in anon', () => {
        mockPage({ signedIn: true });

        render(
            <Thread
                slug="/g/"
                no={KNOWN_THREAD.no}
                thread={KNOWN_THREAD}
                comments={COMMENTS}
                maxCommentChars={2000}
            />,
        );

        expect(screen.getByTestId('reply-composer-stub')).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Reply to this thread' }),
        ).not.toBeInTheDocument();
    });

    /**
     * Below `md` the reply box is a link to the composer page, not a field.
     *
     * A two-line textarea under two hundred comments, with the keyboard over
     * the top of it, is the shape this replaces. The trigger is pinned to the
     * foot of the screen -- which is also where the comments now end, since
     * the composer no longer sits between the post and the replies.
     */
    it('offers a link to the composer page below `md`, not the inline field', () => {
        setViewport(true);
        mockPage({ signedIn: true });

        render(
            <Thread
                slug="/g/"
                no={KNOWN_THREAD.no}
                thread={KNOWN_THREAD}
                comments={COMMENTS}
                maxCommentChars={2000}
            />,
        );

        expect(
            screen.getByRole('link', { name: /join the conversation/i }),
        ).toHaveAttribute('href', `/g/${KNOWN_THREAD.no}/reply`);
        expect(
            screen.queryByTestId('reply-composer-stub'),
        ).not.toBeInTheDocument();
    });

    /**
     * Signed out, the same slot is the auth gate rather than a link into a
     * page that would bounce them at the door.
     */
    it('offers the auth prompt below `md` to a signed-out anon, not the composer link', () => {
        setViewport(true);
        mockPage({ signedIn: false });

        render(
            <Thread
                slug="/g/"
                no={KNOWN_THREAD.no}
                thread={KNOWN_THREAD}
                comments={COMMENTS}
                maxCommentChars={2000}
            />,
        );

        expect(
            screen.queryByRole('link', { name: /join the conversation/i }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Reply to this thread' }),
        ).toBeInTheDocument();
    });

    it('shows an auth prompt rather than the composer to a signed-out anon, opening the auth gate on press', async () => {
        const user = userEvent.setup();
        mockPage({ signedIn: false });

        render(
            <Thread
                slug="/g/"
                no={KNOWN_THREAD.no}
                thread={KNOWN_THREAD}
                comments={COMMENTS}
                maxCommentChars={2000}
            />,
        );

        expect(
            screen.queryByTestId('reply-composer-stub'),
        ).not.toBeInTheDocument();

        expect(screen.queryByTestId('auth-gate-stub')).not.toBeInTheDocument();

        await user.click(
            screen.getByRole('button', { name: 'Reply to this thread' }),
        );

        expect(screen.getByTestId('auth-gate-stub')).toHaveTextContent(
            'reply to this thread',
        );
    });

    it('renders the not-found state for a post number matching no thread, with no composer and no comment tree', () => {
        mockPage({ signedIn: true });

        render(
            <Thread
                slug="/g/"
                no={999999999}
                thread={null}
                comments={[]}
                maxCommentChars={2000}
            />,
        );

        expect(
            screen.getByRole('heading', {
                name: 'Thread >>999999999 is not here',
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                'It was pruned, deleted, or never existed. Board archives keep threads for 72 hours.',
            ),
        ).toBeInTheDocument();

        expect(
            screen.queryByTestId('reply-composer-stub'),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('list', { name: 'Replies' }),
        ).not.toBeInTheDocument();
        expect(screen.queryAllByRole('heading', { level: 1 })).toHaveLength(0);
    });

    it('points the not-found action at the board the slug names', () => {
        render(
            <Thread
                slug="/g/"
                no={999999999}
                thread={null}
                comments={[]}
                maxCommentChars={2000}
            />,
        );

        const backLink = screen.getByRole('link', { name: /back to \/g\//i });
        expect(backLink).toHaveAttribute('href', '/g');
    });

    /**
     * The opening post's bookmark control has to report the state the server
     * sent, not a default.
     *
     * It did not. `OriginalPost` takes `bookmarked` and defaults it to false;
     * this page passed `onBookmark` and never passed `bookmarked`, so a thread
     * an anon had already saved drew an empty bookmark on the one screen where
     * they were most likely to check. Pressing it then issued a `POST` to save
     * a thread that was already saved.
     *
     * `aria-pressed` rather than the fill class: the state is what is being
     * asserted, and it is also what a screen reader announces.
     */
    it('shows the opening post as bookmarked when the server says it is', () => {
        mockPage({ signedIn: true });

        render(
            <Thread
                slug="/g/"
                no={KNOWN_THREAD.no}
                thread={{ ...KNOWN_THREAD, bookmarked: true }}
                comments={COMMENTS}
                maxCommentChars={2000}
            />,
        );

        expect(
            screen.getByRole('button', { name: 'Bookmark thread' }),
        ).toHaveAttribute('aria-pressed', 'true');
    });

    it('shows the opening post as not bookmarked when it is not', () => {
        mockPage({ signedIn: true });

        render(
            <Thread
                slug="/g/"
                no={KNOWN_THREAD.no}
                thread={{ ...KNOWN_THREAD, bookmarked: false }}
                comments={COMMENTS}
                maxCommentChars={2000}
            />,
        );

        expect(
            screen.getByRole('button', { name: 'Bookmark thread' }),
        ).toHaveAttribute('aria-pressed', 'false');
    });

    /**
     * The three controls on every comment used to be inert: `CommentTree`
     * called optional props through `?.` and no caller anywhere passed them.
     * These assert the page is now one of the callers.
     */
    it('quotes a comment into the composer when its reply control is pressed', async () => {
        mockPage({ signedIn: true });

        render(
            <Thread
                slug="/g/"
                no={KNOWN_THREAD.no}
                thread={KNOWN_THREAD}
                comments={COMMENTS}
                maxCommentChars={2000}
            />,
        );

        const [firstComment] = COMMENTS;

        await userEvent.click(
            within(
                screen.getByRole('article', {
                    name: new RegExp(String(firstComment.no)),
                }),
            ).getByRole('button', { name: /^reply$/i }),
        );

        expect(screen.getByTestId('reply-composer-stub')).toHaveAttribute(
            'data-quote',
            String(firstComment.no),
        );
    });

    it('scrolls to the post a quote reference names', async () => {
        const scrollIntoView = vi.fn();
        /* jsdom implements no scrolling at all, so the method has to exist
           before the handler can call it. */
        Element.prototype.scrollIntoView = scrollIntoView;

        mockPage({ signedIn: true });

        render(
            <Thread
                slug="/g/"
                no={KNOWN_THREAD.no}
                thread={KNOWN_THREAD}
                comments={COMMENTS}
                maxCommentChars={2000}
            />,
        );

        /* The shared fixture quotes nothing -- `makeComment` defaults
           `quotes` to an empty array -- so this case builds the one shape it
           is about: a reply that answers the comment above it. */
        const answered = makeComment({ body: 'Eight cores, 16 GB.' });
        const answering = makeComment({
            body: 'That is usable, not fast.',
            quotes: [answered.no],
        });

        cleanup();
        render(
            <Thread
                slug="/g/"
                no={KNOWN_THREAD.no}
                thread={KNOWN_THREAD}
                comments={[answered, answering]}
                maxCommentChars={2000}
            />,
        );

        await userEvent.click(
            screen.getByRole('button', { name: `>>${answered.no}` }),
        );

        expect(scrollIntoView).toHaveBeenCalled();
    });

    /**
     * Below `md` the composer is a page of its own, so there is no field on
     * this screen for a quote to land in. The control is therefore not drawn
     * -- rather than drawn and dead, which is how it shipped.
     */
    it('draws no reply control on a comment where there is no composer to quote into', () => {
        mockPage({ signedIn: true });
        setViewport(true);

        render(
            <Thread
                slug="/g/"
                no={KNOWN_THREAD.no}
                thread={KNOWN_THREAD}
                comments={COMMENTS}
                maxCommentChars={2000}
            />,
        );

        expect(
            screen.queryByRole('button', { name: /^reply$/i }),
        ).not.toBeInTheDocument();
    });

    it("shows the server's rejection against the composer", () => {
        mockPage({
            signedIn: true,
            errors: { body: 'The body field is required.' },
        });

        render(
            <Thread
                slug="/g/"
                no={KNOWN_THREAD.no}
                thread={KNOWN_THREAD}
                comments={COMMENTS}
                maxCommentChars={2000}
            />,
        );

        expect(screen.getByTestId('reply-composer-stub')).toHaveAttribute(
            'data-error',
            'The body field is required.',
        );
    });

    it("does not render a second <main>: that is AppLayout's job", () => {
        render(
            <Thread
                slug="/g/"
                no={KNOWN_THREAD.no}
                thread={KNOWN_THREAD}
                comments={COMMENTS}
                maxCommentChars={2000}
            />,
        );

        expect(screen.queryByRole('main')).not.toBeInTheDocument();
    });
});
