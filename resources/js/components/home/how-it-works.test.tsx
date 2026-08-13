import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HowItWorks } from '@/components/home/how-it-works';

describe('HowItWorks', () => {
    it('renders the section heading', () => {
        render(<HowItWorks />);

        expect(
            screen.getByRole('heading', {
                level: 2,
                name: 'Three steps, no onboarding tour',
            }),
        ).toBeInTheDocument();
    });

    it('renders an ordered list of three steps', () => {
        render(<HowItWorks />);

        const list = screen.getByRole('list');

        expect(list.tagName).toBe('OL');
        expect(screen.getAllByRole('listitem')).toHaveLength(3);
    });

    it('renders each step title as a heading and its body verbatim', () => {
        render(<HowItWorks />);

        expect(
            screen.getByRole('heading', { level: 3, name: 'Pick your boards' }),
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                'Subscribe to /g/, /wg/ or any of 74 boards. Your list syncs, nothing else does.',
            ),
        ).toBeInTheDocument();

        expect(
            screen.getByRole('heading', {
                level: 3,
                name: 'Read now, account later',
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                'Browsing is open to everyone. Create an account when you want to post or comment.',
            ),
        ).toBeInTheDocument();

        expect(
            screen.getByRole('heading', {
                level: 3,
                name: 'Bump what deserves it',
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                'Replies bump a thread back to the top. There is nothing to upvote and no score to farm.',
            ),
        ).toBeInTheDocument();
    });

    /** The zero-padded step number must appear once, not once in markup and
     * once again via the list's own numbering. */
    it('shows each zero-padded step number exactly once', () => {
        render(<HowItWorks />);

        expect(screen.getByText('01')).toBeInTheDocument();
        expect(screen.getByText('02')).toBeInTheDocument();
        expect(screen.getByText('03')).toBeInTheDocument();
    });

    it('does not announce the step number a second time through list numbering', () => {
        render(<HowItWorks />);

        const list = screen.getByRole('list');

        expect(list).toHaveClass('list-none');
    });

    /**
     * Steps are deliberately not cards: a rule above each column, not a
     * bordered/backgrounded surface.
     */
    it('is not built from cards', () => {
        const { container } = render(<HowItWorks />);

        expect(container.querySelectorAll('[data-slot="card"]')).toHaveLength(
            0,
        );
    });

    it('contains no em dashes anywhere in its rendered text', () => {
        const { container } = render(<HowItWorks />);

        expect(container.textContent).not.toMatch(/—|--/);
    });
});
