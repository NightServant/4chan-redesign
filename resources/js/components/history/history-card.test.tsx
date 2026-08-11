import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { HistoryCard } from '@/components/history/history-card';
import { TooltipProvider } from '@/components/ui/tooltip';
import { HISTORY } from '@/fixtures/clover';
import type { HistoryEntry } from '@/types/clover';

vi.mock('@inertiajs/react', () => ({
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

    it('names the attachment placeholder rather than inventing an image', () => {
        renderCard(unfinished);

        expect(
            screen.getByRole('img', { name: 'Attachment: thumb · 640×360' }),
        ).toBeInTheDocument();
        expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
    });
});
