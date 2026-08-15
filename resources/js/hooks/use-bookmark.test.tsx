import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeThread } from '@/fixtures/factories';
import { useBookmark } from '@/hooks/use-bookmark';
import type { User } from '@/types/auth';

const { usePage, router } = vi.hoisted(() => ({
    usePage: vi.fn(),
    router: { post: vi.fn(), delete: vi.fn(), visit: vi.fn() },
}));

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
    router.post.mockClear();
    router.delete.mockClear();
    mockPage(true);
});

describe('useBookmark', () => {
    it('saves a thread that is not saved', async () => {
        const user = userEvent.setup();
        render(<Harness bookmarked={false} />);

        await user.click(screen.getByRole('button', { name: 'Toggle' }));

        expect(router.post).toHaveBeenCalledWith('/threads/7/bookmark', {
            preserveScroll: true,
        });
        expect(router.delete).not.toHaveBeenCalled();
    });

    it('unsaves one that is', async () => {
        const user = userEvent.setup();
        render(<Harness bookmarked />);

        await user.click(screen.getByRole('button', { name: 'Toggle' }));

        expect(router.delete).toHaveBeenCalledWith('/threads/7/bookmark', {
            preserveScroll: true,
        });
        expect(router.post).not.toHaveBeenCalled();
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
        expect(router.post).not.toHaveBeenCalled();
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
 */
const PAGES_DIR = join(process.cwd(), 'resources/js/pages');

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
    const withCards = pageFiles(PAGES_DIR).filter((path) =>
        readFileSync(path, 'utf8').includes('<ThreadCard'),
    );

    it('finds the pages it is meant to be checking', () => {
        expect(withCards.length).toBeGreaterThanOrEqual(6);
    });

    it.each(
        withCards.map((path) => [path.replace(`${process.cwd()}/`, ''), path]),
    )('%s hands the card a bookmark handler', (_name, path) => {
        expect(readFileSync(path, 'utf8')).toContain('onBookmark');
    });
});
