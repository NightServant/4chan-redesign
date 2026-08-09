import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { BoardHeader } from '@/components/feed/board-header';
import type { Board } from '@/types/clover';

const TECH_BOARD: Board = {
    slug: '/g/',
    name: 'Technology',
    online: '41,208',
};

describe('BoardHeader', () => {
    it("renders the board's name as a heading", () => {
        render(<BoardHeader board={TECH_BOARD} />);

        expect(
            screen.getByRole('heading', { level: 1, name: 'Technology' }),
        ).toBeInTheDocument();
    });

    it('renders the slug and online count through one MachineValue', () => {
        render(<BoardHeader board={TECH_BOARD} />);

        expect(screen.getByText('/g/ · 41,208 online')).toBeInTheDocument();
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
     * The fixtures carry no per-board description, so a per-board line would
     * be invented copy. This checks the one line shown is genuinely
     * board-agnostic by rendering two different boards and asserting the
     * body text is identical.
     */
    it('shows the same description line for every board rather than inventing per-board copy', () => {
        const { unmount } = render(<BoardHeader board={TECH_BOARD} />);
        const techDescription = screen.getByText(/^Anonymous/).textContent;
        unmount();

        render(
            <BoardHeader
                board={{ slug: '/x/', name: 'Paranormal', online: '7,442' }}
            />,
        );
        const paranormalDescription =
            screen.getByText(/^Anonymous/).textContent;

        expect(paranormalDescription).toBe(techDescription);
    });
});
