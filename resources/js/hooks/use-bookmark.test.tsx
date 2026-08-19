import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeThread } from '@/fixtures/factories';
import { useBookmark } from '@/hooks/use-bookmark';
import type { User } from '@/types/auth';

/**
 * A router double that behaves like the real one, and specifically one whose
 * `post` and `delete` are *methods* that go through `this`.
 *
 * The previous double was `{ post: vi.fn(), delete: vi.fn() }` — three plain
 * functions with no receiver. That cannot express the way Inertia's router
 * actually fails, and the way this hook actually broke: picking the method off
 * the object (`const request = cond ? router.delete : router.post`) detaches
 * it, so `this` is undefined inside and Inertia throws
 * `Cannot read properties of undefined (reading 'visit')`.
 *
 * Every page carried that line, the tests were green throughout, and the
 * bookmark button had never once worked for a signed-in anon. A mock that
 * cannot reproduce the failure is a mock that certifies the bug.
 */
const { usePage, router } = vi.hoisted(() => ({
    usePage: vi.fn(),
    router: {
        visit: vi.fn(),
        post(url: string, data?: unknown, options?: unknown) {
            return this.visit(url, {
                ...(options ?? {}),
                method: 'post',
                data,
            });
        },
        delete(url: string, options?: unknown) {
            return this.visit(url, { ...(options ?? {}), method: 'delete' });
        },
    },
}));

const { toast } = vi.hoisted(() => ({
    toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('sonner', () => ({ toast }));

vi.mock('@inertiajs/react', () => ({
    usePage,
    router,
    Link: ({
        href,
        children,
        ...props
    }: {
        href: string | { url: string };
        children: ReactNode;
    } & Record<string, unknown>) => (
        <a href={typeof href === 'string' ? href : href.url} {...props}>
            {children}
        </a>
    ),
}));

const USER: User = {
    id: 1,
    email: 'anon@example.com',
    email_verified_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
};

function mockPage(signedIn: boolean): void {
    usePage.mockReturnValue({
        url: '/dashboard',
        props: { auth: { user: signedIn ? USER : null } },
    });
}

function Harness({ bookmarked }: { bookmarked: boolean }) {
    const { toggleBookmark, authGate } = useBookmark();
    const thread = makeThread({ id: 7, bookmarked });

    return (
        <>
            <button type="button" onClick={() => toggleBookmark(thread)}>
                Toggle
            </button>
            {authGate}
        </>
    );
}

beforeEach(() => {
    router.visit.mockClear();
    mockPage(true);
});

describe('useBookmark', () => {
    /**
     * A rejected save says so.
     *
     * The request went out with `preserveScroll` and nothing else: no
     * `onError`, and no page reading `errors`. A save refused -- by the
     * throttle, by a session that expired in another tab, by a board the
     * account has since opted out of -- left the bookmark exactly as it was
     * with no explanation, which reads as a button that does not work.
     */
    it('says so when the server refuses to save', async () => {
        render(<Harness bookmarked={false} />);

        await userEvent.click(screen.getByRole('button', { name: 'Toggle' }));

        const options = router.visit.mock.calls.at(-1)?.[1] as {
            onError?: () => void;
        };

        expect(options.onError).toBeTypeOf('function');

        options.onError?.();

        expect(toast.error).toHaveBeenCalled();
    });

    it('saves a thread that is not saved', async () => {
        const user = userEvent.setup();
        render(<Harness bookmarked={false} />);

        await user.click(screen.getByRole('button', { name: 'Toggle' }));

        expect(router.visit).toHaveBeenCalledWith(
            '/threads/7/bookmark',
            expect.objectContaining({ method: 'post' }),
        );
    });

    it('unsaves one that is', async () => {
        const user = userEvent.setup();
        render(<Harness bookmarked />);

        await user.click(screen.getByRole('button', { name: 'Toggle' }));

        expect(router.visit).toHaveBeenCalledWith(
            '/threads/7/bookmark',
            expect.objectContaining({ method: 'delete' }),
        );
    });

    /**
     * The press happens mid-list and the reply is a redirect back. Without
     * this the page returns to the top and the row an anon just saved is
     * somewhere above them, which reads as nothing having happened.
     *
     * It also has to arrive as an *option*. `router.post(url, data, options)`
     * — passing it second put it in the request body, where it did nothing.
     */
    it('preserves scroll on both directions', async () => {
        const user = userEvent.setup();

        render(<Harness bookmarked={false} />);
        await user.click(screen.getByRole('button', { name: 'Toggle' }));

        expect(router.visit).toHaveBeenLastCalledWith(
            '/threads/7/bookmark',
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    /**
     * Reading is open, and being bounced out of a page for reaching at a
     * control is not how that reads.
     */
    it('opens the gate for a signed-out anon and sends nothing', async () => {
        const user = userEvent.setup();
        mockPage(false);

        render(<Harness bookmarked={false} />);

        await user.click(screen.getByRole('button', { name: 'Toggle' }));

        expect(await screen.findByRole('dialog')).toBeInTheDocument();
        expect(router.visit).not.toHaveBeenCalled();
    });
});

/**
 * Every screen that draws a bookmark button has to wire it.
 *
 * This is the bug that produced the hook. `ThreadCard` draws the button
 * unconditionally and calls whatever `onBookmark` it was handed; the board,
 * search and the account screen's Saved tab handed it nothing, so the button
 * was there, looked identical to the working ones, and did nothing at all.
 *
 * Reading the pages as files is crude and it is the only thing that catches
 * the next screen somebody adds a card to.
 *
 * `<HistoryEntryList` is a second marker, not just `<ThreadCard`, because
 * `history.tsx` no longer renders `ThreadCard` directly -- the day-grouped
 * list that does now lives in its own component, shared with the account
 * screen's History tab. A page that renders that component still owes it a
 * real `onBookmark`, the same as a page rendering the card itself; checking
 * only the literal tag would have let history.tsx quietly drop out of this
 * guard the moment the card moved one level down.
 */
const PAGES_DIR = join(process.cwd(), 'resources/js/pages');

const CARD_MARKERS = ['<ThreadCard', '<HistoryEntryList'];

function pageFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
        const path = join(dir, entry);

        if (statSync(path).isDirectory()) {
            return pageFiles(path);
        }

        return entry.endsWith('.tsx') && !entry.endsWith('.test.tsx')
            ? [path]
            : [];
    });
}

describe('every page that renders a ThreadCard', () => {
    const withCards = pageFiles(PAGES_DIR).filter((path) => {
        const contents = readFileSync(path, 'utf8');

        return CARD_MARKERS.some((marker) => contents.includes(marker));
    });

    it('finds the pages it is meant to be checking', () => {
        expect(withCards.length).toBeGreaterThanOrEqual(6);
    });

    it.each(
        withCards.map((path) => [path.replace(`${process.cwd()}/`, ''), path]),
    )('%s hands the card a bookmark handler', (_name, path) => {
        expect(readFileSync(path, 'utf8')).toContain('onBookmark');
    });
});
