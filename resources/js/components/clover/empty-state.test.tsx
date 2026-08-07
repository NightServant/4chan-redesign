import { render, screen } from '@testing-library/react';
import { SearchIcon } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { EmptyState } from '@/components/clover/empty-state';

describe('EmptyState', () => {
    it('announces its title as a heading', () => {
        render(
            <EmptyState
                title="No bookmarks yet"
                body="Threads you save appear here."
            />,
        );

        expect(
            screen.getByRole('heading', { name: 'No bookmarks yet' }),
        ).toBeInTheDocument();
    });

    it('renders the explanatory body', () => {
        render(
            <EmptyState
                title="No messages"
                body="Anons can send you a message."
            />,
        );

        expect(
            screen.getByText('Anons can send you a message.'),
        ).toBeInTheDocument();
    });

    it('hides the decorative icon from assistive technology', () => {
        const { container } = render(
            <EmptyState
                icon={<SearchIcon />}
                title="Nothing matches"
                body="Try a different board."
            />,
        );

        // The icon repeats what the heading already says, so it is decoration.
        expect(
            container.querySelector('[aria-hidden="true"]'),
        ).toBeInTheDocument();
    });

    it('renders an action when one is given, and omits the slot otherwise', () => {
        const { rerender } = render(
            <EmptyState
                title="Nothing here"
                body="Not yet."
                action={<button type="button">Back to the feed</button>}
            />,
        );

        expect(
            screen.getByRole('button', { name: 'Back to the feed' }),
        ).toBeInTheDocument();

        rerender(<EmptyState title="Nothing here" body="Not yet." />);

        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    /**
     * Clover's empty states are dry and specific. This guards the tone at the
     * component level so a cheerful string cannot slip in through a caller.
     */
    it('does not wrap itself in a card', () => {
        const { container } = render(
            <EmptyState title="No messages" body="Nothing yet." />,
        );

        const root = container.firstElementChild;

        expect(root?.className).not.toMatch(/\bborder\b/);
        expect(root?.className).not.toMatch(/\bshadow-/);
    });
});
