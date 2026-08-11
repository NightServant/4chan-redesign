import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { BoardHeader } from '@/components/feed/board-header';
import type { Board } from '@/types/clover';

const TECH_BOARD: Board = {
    id: 1,
    slug: '/g/',
    name: 'Technology',
    threads: '41,208',
    subscribed: false,
};

describe('BoardHeader', () => {
    it("renders the board's name as a heading", () => {
        render(<BoardHeader board={TECH_BOARD} />);

        expect(
            screen.getByRole('heading', { level: 1, name: 'Technology' }),
        ).toBeInTheDocument();
    });

    it('renders the slug and thread count through one MachineValue', () => {
        render(<BoardHeader board={TECH_BOARD} />);

        expect(screen.getByText('/g/ · 41,208 threads')).toBeInTheDocument();
    });

    /**
     * The guard that keeps the deleted `online` field from coming back under a
     * new name. 4chan publishes no online count at any scope, so any copy here
     * reading "online" is describing a number nothing produced.
     */
    it('never claims to report anons online, since nothing upstream counts them', () => {
        const { container } = render(<BoardHeader board={TECH_BOARD} />);

        expect(container.textContent).not.toMatch(/online/i);
    });

    it('says "thread", not "threads", for a board carrying exactly one', () => {
        render(<BoardHeader board={{ ...TECH_BOARD, threads: '1' }} />);

        expect(screen.getByText('/g/ · 1 thread')).toBeInTheDocument();
    });

    it("labels the board avatar with the board's token", () => {
        render(<BoardHeader board={TECH_BOARD} />);

        expect(
            screen.getByRole('img', { name: 'g board' }),
        ).toBeInTheDocument();
    });

    it('toggles the subscribe button between Subscribe and Subscribed on click', async () => {
        const user = userEvent.setup();
        render(<BoardHeader board={TECH_BOARD} />);

        const toggle = screen.getByRole('button', { name: 'Subscribe' });
        expect(toggle).toHaveAttribute('aria-pressed', 'false');

        await user.click(toggle);

        const pressed = screen.getByRole('button', { name: 'Subscribed' });
        expect(pressed).toHaveAttribute('aria-pressed', 'true');

        await user.click(pressed);

        expect(
            screen.getByRole('button', { name: 'Subscribe' }),
        ).toHaveAttribute('aria-pressed', 'false');
    });

    it('does not wrap itself in a card, so it cannot stack as a second card on the thread list', () => {
        const { container } = render(<BoardHeader board={TECH_BOARD} />);

        expect(
            container.querySelector('[data-slot="card"]'),
        ).not.toBeInTheDocument();
    });

    /**
     * The board page now receives 4chan's own `meta_description`, so the line
     * under the slug can finally be about this board rather than about the
     * product. Two different boards must therefore read differently.
     */
    it("shows the board's own description when it has one", () => {
        const { unmount } = render(
            <BoardHeader
                board={{
                    ...TECH_BOARD,
                    description:
                        'Technology - Computers, phones, and everything with a chip in it.',
                }}
            />,
        );
        expect(
            screen.getByText(/Computers, phones, and everything/),
        ).toBeInTheDocument();
        unmount();

        render(
            <BoardHeader
                board={{
                    id: 2,
                    slug: '/x/',
                    name: 'Paranormal',
                    threads: '7,442',
                    subscribed: false,
                    description: 'Paranormal - Ghosts, cryptids, and dreams.',
                }}
            />,
        );
        expect(
            screen.getByText(/Ghosts, cryptids, and dreams/),
        ).toBeInTheDocument();
    });

    /**
     * Boards reached without a description fall back to a line that is true of
     * every board rather than to a plausible-sounding summary of this one.
     * Rendering two different boards and comparing the text is what proves the
     * fallback is genuinely board-agnostic.
     */
    it('falls back to one board-agnostic line rather than inventing per-board copy', () => {
        const { unmount } = render(<BoardHeader board={TECH_BOARD} />);
        const techDescription = screen.getByText(/^Anonymous/).textContent;
        unmount();

        render(
            <BoardHeader
                board={{
                    id: 1,
                    slug: '/x/',
                    name: 'Paranormal',
                    threads: '7,442',
                    subscribed: false,
                }}
            />,
        );
        const paranormalDescription =
            screen.getByText(/^Anonymous/).textContent;

        expect(paranormalDescription).toBe(techDescription);
    });

    it('falls back rather than rendering an empty line for a board whose description is blank', () => {
        render(<BoardHeader board={{ ...TECH_BOARD, description: '' }} />);

        expect(screen.getByText(/^Anonymous/)).toBeInTheDocument();
    });
});
