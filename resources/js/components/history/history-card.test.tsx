import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { HistoryCard } from '@/components/history/history-card';
import { TooltipProvider } from '@/components/ui/tooltip';
import { makeAttachment, makeHistoryEntry } from '@/fixtures/factories';
import type { HistoryEntry } from '@/types/clover';

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: { recentActivity: [], sidebarBoards: [] },
    }),
    router: { post: vi.fn(), delete: vi.fn(), visit: vi.fn() },
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

const HISTORY = [
    makeHistoryEntry({
        no: 58210441,
        title: 'Anons are still arguing about init systems',
        when: 'Today, 14:02',
        day: 'Today',
        progress: 68,
        media: makeAttachment({
            label: 'thumb · 640×360',
            filename: 'thumb.png',
        }),
    }),
    makeHistoryEntry({
        title: 'Mainline kernel support or vendor tree',
        when: 'Yesterday, 09:15',
        day: 'Yesterday',
        progress: 100,
    }),
];
const [unfinished, finished] = HISTORY;

function renderCard(entry: HistoryEntry) {
    return render(
        <TooltipProvider>
            <HistoryCard entry={entry} />
        </TooltipProvider>,
    );
}

describe('HistoryCard', () => {
    it('renders the board, timestamp and post number as one machine line', () => {
        renderCard(unfinished);

        expect(
            screen.getByText('/g/ · Today, 14:02 · >>58210441'),
        ).toBeInTheDocument();
    });

    it('links the title at the thread', () => {
        renderCard(unfinished);

        expect(
            screen.getByRole('link', { name: unfinished.title }),
        ).toHaveAttribute('href', '/g/58210441');
    });

    it('links "Continue reading" at the same thread', () => {
        renderCard(unfinished);

        expect(
            screen.getByRole('link', { name: 'Continue reading' }),
        ).toHaveAttribute('href', '/g/58210441');
    });

    /**
     * This asserted a labelled placeholder, which was right while media was
     * metadata with no file behind it. There is a file now, so the row shows
     * the thread's own attachment named after it — still only what 4chan
     * reported, still nothing invented.
     */
    it('shows the thread attachment, named after the file', () => {
        renderCard(unfinished);

        expect(
            screen.getByRole('img', { name: 'thumb.png' }),
        ).toBeInTheDocument();
    });

    it('shows nothing where a thread opened without an attachment', () => {
        renderCard(finished);

        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    /**
     * A history of threads should look like the threads it is a history of,
     * so the row matches the feed's: a hairline, no card, and the hover on the
     * title alone.
     */
    it('is a row on a hairline, not a card', () => {
        const { container } = render(<HistoryCard entry={HISTORY[0]} />);

        expect(container.querySelector('[data-slot="card"]')).toBeNull();
        expect(
            container.querySelector('[data-slot="history-row"]')?.className,
        ).toMatch(/border-b/);
    });

    /**
     * The bar was always at zero. Reading progress is never measured — nothing
     * on the thread page reports how far down an anon got — so every row
     * reported `0% read` under a bar that never moved.
     */
    it('reports no reading progress, which was never measured', () => {
        render(<HistoryCard entry={HISTORY[0]} />);

        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
        expect(screen.queryByText(/% read/)).not.toBeInTheDocument();
    });

    /**
     * The page has a Clear all. A row of bins invites curating a list that is
     * only a record of what was opened.
     */
    it('offers no per-row delete', () => {
        render(<HistoryCard entry={HISTORY[0]} />);

        expect(
            screen.queryByRole('button', { name: /remove/i }),
        ).not.toBeInTheDocument();
    });
});
