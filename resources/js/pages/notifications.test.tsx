import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import Notifications from '@/pages/notifications';
import type { ThreadNotification } from '@/types/clover';

vi.mock('@inertiajs/react', () => ({
    /* `PageMeta` reads the shared `appUrl` to build an absolute `og:url`, and
       renders its tags inside `Head`. Neither shows up in the DOM these tests
       query; the mock exists so the component can mount. */
    usePage: () => ({ props: { appUrl: 'https://clover.test' }, url: '/' }),
    Head: () => null,
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

const NOTIFICATIONS: ThreadNotification[] = [
    {
        threadId: 1,
        no: 58210441,
        board: '/g/',
        title: 'Anons are still arguing about init systems',
        replies: 3,
        reason: 'saved',
        time: '2 min ago',
    },
    {
        threadId: 2,
        no: 58210442,
        board: '/x/',
        title: 'Something in the walls',
        replies: 1,
        reason: 'posted',
        time: '1 hr ago',
    },
];

describe('Notifications', () => {
    it('renders one row per thread, linked at the thread', () => {
        render(<Notifications notifications={NOTIFICATIONS} />);

        const rows = screen.getAllByRole('link', { name: /new repl/i });

        expect(rows).toHaveLength(2);
        expect(rows[0]).toHaveAttribute('href', '/g/58210441');
        expect(rows[1]).toHaveAttribute('href', '/x/58210442');
    });

    /** One reply is not "1 new replies". */
    it('counts replies in the singular when there is one', () => {
        render(<Notifications notifications={NOTIFICATIONS} />);

        expect(screen.getByText('1 new reply')).toBeInTheDocument();
        expect(screen.getByText('3 new replies')).toBeInTheDocument();
    });

    /**
     * An anon looking at threads they did not pick one at a time needs to know
     * which of their own actions put each one on the list.
     */
    it('says why each thread is being watched', () => {
        render(<Notifications notifications={NOTIFICATIONS} />);

        expect(screen.getByText(/in a thread you saved/i)).toBeInTheDocument();
        expect(
            screen.getByText(/in a thread you posted in/i),
        ).toBeInTheDocument();
    });

    it('names the thread and when the last reply landed', () => {
        render(<Notifications notifications={NOTIFICATIONS} />);

        expect(
            screen.getByText(/Anons are still arguing about init systems/),
        ).toBeInTheDocument();
        expect(screen.getByText(/2 min ago/)).toBeInTheDocument();
    });

    /**
     * The screen this replaced said "You are caught up" under "Replies and
     * janitor actions appear here" — two claims about machinery that does not
     * exist, on a page that could never have shown anything. The empty state
     * has to explain why nothing is here rather than imply the reader cleared
     * it.
     */
    it('explains why it is empty instead of claiming the reader caught up', () => {
        render(<Notifications notifications={[]} />);

        expect(
            screen.getByText(/cannot notify you personally/i),
        ).toBeInTheDocument();
        expect(screen.queryByText(/caught up/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/janitor/i)).not.toBeInTheDocument();
    });

    it('offers a way out of the empty state', () => {
        render(<Notifications notifications={[]} />);

        expect(
            screen.getByRole('link', { name: 'Find a thread' }),
        ).toHaveAttribute('href', '/popular');
    });

    it("does not render a second <main>: that is AppLayout's job", () => {
        render(<Notifications notifications={NOTIFICATIONS} />);

        expect(screen.queryByRole('main')).not.toBeInTheDocument();
    });
});
