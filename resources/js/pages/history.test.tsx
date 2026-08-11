import { router } from '@inertiajs/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { makeHistoryEntry } from '@/fixtures/factories';
import History from '@/pages/history';

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: { recentActivity: [], sidebarBoards: [] },
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

/**
 * Radix Select drives its listbox with pointer capture APIs jsdom does not
 * implement. Same stubs `select.test.tsx` installs, for the same reason.
 */
beforeAll(() => {
    Element.prototype.hasPointerCapture = () => false;
    Element.prototype.setPointerCapture = () => {};
    Element.prototype.releasePointerCapture = () => {};
});

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

/**
 * Five entries across the three day groups, sized against the page's own
 * `PAGE_SIZE` of four: the first page holds Today and Yesterday, and Earlier
 * only appears on the second. Progress is set so that sorting by least
 * finished drops the one at 95% off the first page, which is what makes the
 * sort observable as a different set rather than a reshuffle.
 */
const HISTORY = [
    makeHistoryEntry({
        title: 'Anons are still arguing about init systems',
        day: 'Today',
        when: 'Today, 14:02',
        progress: 10,
    }),
    makeHistoryEntry({
        title: 'Dark minimal wallpaper thread — 3840x2160 only',
        day: 'Today',
        when: 'Today, 11:20',
        progress: 95,
    }),
    makeHistoryEntry({
        title: 'Mainline kernel support or vendor tree',
        day: 'Yesterday',
        when: 'Yesterday, 09:15',
        progress: 20,
    }),
    makeHistoryEntry({
        title: 'Battery life under sustained load',
        day: 'Yesterday',
        when: 'Yesterday, 08:02',
        progress: 30,
    }),
    makeHistoryEntry({
        title: 'Cross compiling on an x86 box',
        day: 'Earlier',
        when: '3 Aug 2026, 21:40',
        progress: 40,
    }),
];
describe('History', () => {
    it('names the screen and says where the data lives', () => {
        renderHistory();

        expect(
            screen.getByRole('heading', { level: 1, name: 'History' }),
        ).toBeInTheDocument();
        expect(
            screen.getByText('Threads you opened. Stored on this device only.'),
        ).toBeInTheDocument();
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

    it('states what matched nothing and resets from the empty state', async () => {
        const user = userEvent.setup();
        renderHistory();

        await user.type(
            screen.getByRole('searchbox', { name: 'Search your history' }),
            'zzzz',
        );

        expect(
            screen.getByRole('heading', { name: 'No history to show' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Nothing matches "zzzz".')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Reset' }));

        expect(titles()).toHaveLength(4);
    });

    /**
     * Removal is a request now, not a local filter: an anon who forgets a
     * thread means it, so the entry is deleted and the list comes back from
     * the server rather than being hidden in a copy the page still holds.
     */
    it('asks the server to forget a single entry', async () => {
        const user = userEvent.setup();
        renderHistory();

        await user.click(
            screen.getAllByRole('button', { name: 'Remove from history' })[0],
        );

        expect(router.delete).toHaveBeenCalledWith(
            expect.stringContaining('/read'),
            expect.anything(),
        );
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

    /**
     * Day grouping is the outer order and the sort is the inner one, so
     * changing the sort shows up as a different set of entries on the page
     * rather than as one flat reordering.
     */
    it('changes what the page holds when the sort changes to least finished', async () => {
        const user = userEvent.setup();
        renderHistory();

        expect(titles()).toEqual([
            HISTORY[0].title,
            HISTORY[1].title,
            HISTORY[2].title,
            HISTORY[3].title,
        ]);

        await user.click(
            screen.getByRole('combobox', { name: 'Sort history' }),
        );
        await user.click(
            screen.getByRole('option', { name: 'Least finished' }),
        );

        expect(titles()).toEqual([
            /* Today */ HISTORY[0].title,
            /* Yesterday */ HISTORY[2].title,
            HISTORY[3].title,
            /* Earlier */ HISTORY[4].title,
        ]);
    });

    it('offers no range filter, which the design declared and never applied', () => {
        renderHistory();

        expect(
            screen.queryByRole('combobox', { name: 'Range' }),
        ).not.toBeInTheDocument();
        expect(screen.queryByText('Last 7 days')).not.toBeInTheDocument();
    });
});
