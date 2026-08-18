import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    ReplyComposer: ({
        threadNo,
    }: {
        threadNo: number;
        onReply: (body: string) => void;
    }) => <div data-testid="reply-composer-stub" data-thread-no={threadNo} />,
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

function mockPage({ signedIn = false }: { signedIn?: boolean } = {}) {
    usePage.mockReturnValue({
        url: `/g/${KNOWN_THREAD.no}`,
        props: { auth: { user: signedIn ? SIGNED_IN_USER : null } },
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
