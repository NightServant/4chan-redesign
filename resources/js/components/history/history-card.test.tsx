import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

function renderCard(entry: HistoryEntry, onRemove = () => {}) {
    return render(
        <TooltipProvider>
            <HistoryCard entry={entry} onRemove={onRemove} />
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

    it('exposes read progress to assistive technology and states it in words', () => {
        renderCard(unfinished);

        expect(screen.getByRole('progressbar')).toHaveAttribute(
            'aria-valuenow',
            '68',
        );
        expect(screen.getByText('68% read')).toBeInTheDocument();
    });

    it('says "Read" rather than a percentage once a thread is finished', () => {
        renderCard(finished);

        expect(screen.getByText('Read')).toBeInTheDocument();
        expect(screen.queryByText('100% read')).not.toBeInTheDocument();
    });

    it('removes the entry when the labelled remove control is pressed', async () => {
        const user = userEvent.setup();
        const onRemove = vi.fn();
        renderCard(unfinished, onRemove);

        await user.click(
            screen.getByRole('button', { name: 'Remove from history' }),
        );

        expect(onRemove).toHaveBeenCalledOnce();
    });

    it('removes the entry from the keyboard', async () => {
        const user = userEvent.setup();
        const onRemove = vi.fn();
        renderCard(unfinished, onRemove);

        screen.getByRole('button', { name: 'Remove from history' }).focus();
        await user.keyboard('{Enter}');

        expect(onRemove).toHaveBeenCalledOnce();
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
});
