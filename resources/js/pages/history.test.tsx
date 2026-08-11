import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { HISTORY } from '@/fixtures/clover';
import History from '@/pages/history';

vi.mock('@inertiajs/react', () => ({
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
            <History />
        </TooltipProvider>,
    );
}

function titles() {
    return screen
        .queryAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent);
}

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

    it('drops a single entry when its remove control is pressed', async () => {
        const user = userEvent.setup();
        renderHistory();

        const before = titles();

        await user.click(
            screen.getAllByRole('button', { name: 'Remove from history' })[0],
        );

        expect(titles()).not.toContain(before[0]);
        /* Four entries left is one page, so the pager stops being offered. */
        expect(
            screen.queryByRole('navigation', { name: 'Pagination' }),
        ).not.toBeInTheDocument();
    });

    it('empties the whole list from Clear all', async () => {
        const user = userEvent.setup();
        renderHistory();

        await user.click(screen.getByRole('button', { name: 'Clear all' }));

        expect(titles()).toHaveLength(0);
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
