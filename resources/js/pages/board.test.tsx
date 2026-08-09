import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { THREADS } from '@/fixtures/clover';
import Board from '@/pages/board';
import type { User } from '@/types/auth';

/**
 * The real `Link`/`usePage` require an Inertia page context that only exists
 * inside `createInertiaApp`. This mirrors the double
 * `app-sidebar.test.tsx` uses: `Link` renders a plain anchor (still
 * queryable by role and accessible name) and `usePage` reads a mutable
 * fixture reset in `beforeEach`, which the chrome `Board` renders through
 * `AppLayout` (sidebar, header, mobile nav) also needs.
 */
const mockPage: {
    props: { auth: { user: User | null }; sidebarOpen: boolean };
    url: string;
} = {
    props: { auth: { user: null }, sidebarOpen: true },
    url: '/g/',
};

vi.mock('@inertiajs/react', () => ({
    usePage: () => mockPage,
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

beforeEach(() => {
    mockPage.props = { auth: { user: null }, sidebarOpen: true };
    mockPage.url = '/g/';
});

describe('Board', () => {
    it("renders the board's name, slug and online count in the header", () => {
        render(<Board slug="/g/" />);

        expect(
            screen.getByRole('heading', { level: 1, name: 'Technology' }),
        ).toBeInTheDocument();
        expect(screen.getByText('/g/ · 41,208 online')).toBeInTheDocument();
    });

    it('lists exactly the threads belonging to this board and none of the others', () => {
        render(<Board slug="/g/" />);

        const gThreads = THREADS.filter((thread) => thread.board === '/g/');
        const otherThreads = THREADS.filter((thread) => thread.board !== '/g/');

        for (const thread of gThreads) {
            expect(
                screen.getByRole('link', { name: thread.title }),
            ).toBeInTheDocument();
        }

        for (const thread of otherThreads) {
            expect(
                screen.queryByRole('link', { name: thread.title }),
            ).not.toBeInTheDocument();
        }
    });

    it('renders the empty state and no thread cards for a board with no fixture threads', () => {
        render(<Board slug="/co/" />);

        expect(
            screen.getByRole('heading', { name: 'No threads on /co/ yet' }),
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                'Nothing has been posted to this board. Threads appear here in bump order once they are.',
            ),
        ).toBeInTheDocument();

        for (const thread of THREADS) {
            expect(
                screen.queryByRole('link', { name: thread.title }),
            ).not.toBeInTheDocument();
        }
    });

    it("links the empty state's action to popular()", () => {
        render(<Board slug="/co/" />);

        const action = screen.getByRole('link', {
            name: 'Browse popular threads',
        });

        expect(action).toHaveAttribute('href', '/popular');
    });

    it('toggles the subscribe control and exposes its pressed state to assistive technology', async () => {
        const user = userEvent.setup();
        render(<Board slug="/g/" />);

        const toggle = screen.getByRole('button', { name: 'Subscribe' });
        expect(toggle).toHaveAttribute('aria-pressed', 'false');

        await user.click(toggle);

        expect(
            screen.getByRole('button', { name: 'Subscribed' }),
        ).toHaveAttribute('aria-pressed', 'true');
    });

    it('has exactly one first-level heading', () => {
        render(<Board slug="/g/" />);

        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    });

    it('has exactly one first-level heading on an empty board too', () => {
        render(<Board slug="/co/" />);

        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    });

    it('renders the sort filter row with all three options', () => {
        render(<Board slug="/g/" />);

        const tablist = screen.getByRole('tablist');

        expect(
            within(tablist).getByRole('tab', { name: 'Recently bumped' }),
        ).toBeInTheDocument();
        expect(
            within(tablist).getByRole('tab', { name: 'New' }),
        ).toBeInTheDocument();
        expect(
            within(tablist).getByRole('tab', { name: 'Most blessed' }),
        ).toBeInTheDocument();
    });
});
