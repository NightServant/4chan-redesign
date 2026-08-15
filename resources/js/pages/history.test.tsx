import { router } from '@inertiajs/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { makeHistoryEntry, makeThread } from '@/fixtures/factories';
import History from '@/pages/history';
import type { User } from '@/types/auth';

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            auth: { user: SIGNED_IN_USER },
            appUrl: 'https://clover.test',
            recentActivity: [],
            sidebarBoards: [],
        },
        url: '/history',
    }),
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

function renderHistory() {
    return render(
        <TooltipProvider>
            <History entries={HISTORY} />
        </TooltipProvider>,
    );
}

function titles() {
    return screen
        .queryAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent);
}

const SIGNED_IN_USER: User = {
    id: 1,
    name: 'Anon',
    email: 'anon@example.com',
    email_verified_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
};

/**
 * Nine entries across the three day groups, sized against the page's own
 * `PAGE_SIZE` of eight: the first page holds Today and Yesterday, and Earlier
 * only appears on the second.
 */
function entry(
    title: string,
    day: 'Today' | 'Yesterday' | 'Earlier',
    when: string,
    no: number,
) {
    return makeHistoryEntry({
        thread: makeThread({ title, no }),
        day,
        when,
    });
}

const HISTORY = [
    entry(
        'Anons are still arguing about init systems',
        'Today',
        'Today, 14:02',
        1,
    ),
    entry(
        'Dark minimal wallpaper thread — 3840x2160 only',
        'Today',
        'Today, 11:20',
        2,
    ),
    entry('Mainline kernel support or vendor tree', 'Today', 'Today, 10:40', 3),
    entry('Battery life under sustained load', 'Today', 'Today, 09:30', 4),
    entry(
        'Thermal paste application patterns',
        'Yesterday',
        'Yesterday, 22:10',
        5,
    ),
    entry(
        'Which distro for an old ThinkPad',
        'Yesterday',
        'Yesterday, 18:00',
        6,
    ),
    entry('Mechanical keyboard general', 'Yesterday', 'Yesterday, 09:15', 7),
    entry('Overhead press form check', 'Yesterday', 'Yesterday, 08:02', 8),
    entry('Cross compiling on an x86 box', 'Earlier', '3 Aug 2026, 21:40', 9),
];
describe('History', () => {
    it('names the screen and says where the data lives', () => {
        renderHistory();

        expect(
            screen.getByRole('heading', { level: 1, name: 'History' }),
        ).toBeInTheDocument();
        expect(
            screen.getAllByText('Threads you opened, most recent first.')
                .length,
        ).toBeGreaterThan(0);
    });

    it('groups the first page by day and pages the rest', async () => {
        const user = userEvent.setup();
        renderHistory();

        expect(
            screen.getByRole('region', { name: 'Today' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('region', { name: 'Yesterday' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('region', { name: 'Earlier' }),
        ).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Next page' }));

        expect(
            screen.getByRole('region', { name: 'Earlier' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('region', { name: 'Today' }),
        ).not.toBeInTheDocument();
    });

    it('filters the list as the anon searches', async () => {
        const user = userEvent.setup();
        renderHistory();

        await user.type(
            screen.getByRole('searchbox', { name: 'Search your history' }),
            'wallpaper',
        );

        expect(titles()).toEqual([
            'Dark minimal wallpaper thread — 3840x2160 only',
        ]);
    });

    it('asks the server to forget everything from Clear all', async () => {
        const user = userEvent.setup();
        renderHistory();

        await user.click(screen.getByRole('button', { name: 'Clear all' }));

        expect(router.delete).toHaveBeenCalledWith('/history');
    });

    it('states the absence plainly when there is no history', () => {
        render(
            <TooltipProvider>
                <History entries={[]} />
            </TooltipProvider>,
        );

        expect(
            screen.getByRole('heading', { name: 'No history to show' }),
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                'Threads you open appear here so you can pick them back up.',
            ),
        ).toBeInTheDocument();
    });

    it('offers no range filter, which the design declared and never applied', () => {
        renderHistory();

        expect(
            screen.queryByRole('combobox', { name: 'Range' }),
        ).not.toBeInTheDocument();
        expect(screen.queryByText('Last 7 days')).not.toBeInTheDocument();
    });

    /**
     * A history of threads should look like the threads it is a history of.
     * It used to draw a card of its own, so the same thread rendered two ways
     * on two screens and the two drifted apart: the feed's row grew a bookmark
     * control, an NSFW mark and the reply and image counts, and none of it
     * reached here.
     */
    it("draws each thread with the feed's own card", () => {
        const { container } = renderHistory();

        expect(
            container.querySelectorAll('[data-slot="thread-card"]'),
        ).toHaveLength(8);
        expect(container.querySelector('[data-slot="history-row"]')).toBeNull();
    });

    /** What history knows and the feed does not. */
    it('says when the anon was last on each thread', () => {
        renderHistory();

        expect(screen.getByText('Read Today, 14:02')).toBeInTheDocument();
        expect(screen.getByText('Read Yesterday, 09:15')).toBeInTheDocument();
    });

    /**
     * The bookmark control arrives with the card, and a control that renders
     * on one screen and does nothing on another is the defect this codebase
     * keeps finding — the feed's own button was exactly that for six tasks.
     */
    it('saves a thread from the row, like the feed does', async () => {
        const user = userEvent.setup();
        renderHistory();

        const [save] = screen.getAllByRole('button', {
            name: /save|bookmark/i,
        });

        await user.click(save);

        expect(router.post).toHaveBeenCalled();
    });

    /**
     * The sort control offered "Most recent" and "Least finished" and the
     * function behind it returned the list unchanged for both. "Least
     * finished" could not have worked in any case: it sorted on reading
     * progress, which was removed in task 17 because nothing measures it.
     */
    it('offers no sort it cannot honour', () => {
        renderHistory();

        expect(
            screen.queryByRole('combobox', { name: 'Sort history' }),
        ).not.toBeInTheDocument();
        expect(screen.queryByText('Least finished')).not.toBeInTheDocument();
    });
});
