import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Features } from '@/components/home/features';

const TITLES = [
    'Anonymous by default',
    'Fast on purpose',
    'Nothing to score',
    'Janitors, not bots',
    'Greentext preserved',
    'Boards, not follows',
];

describe('Features', () => {
    it('renders the section heading', () => {
        render(<Features />);

        expect(
            screen.getByRole('heading', {
                name: 'Built for reading, not for engagement',
            }),
        ).toBeInTheDocument();
    });

    /**
     * Six cards became six tabs. Every claim is still on the page, but as a
     * control rather than a tile, so the list is the thing that has to be
     * complete.
     */
    it('offers every claim as a tab', () => {
        render(<Features />);

        const tabs = screen.getAllByRole('tab');

        expect(tabs.map((tab) => tab.textContent)).toEqual(TITLES);
    });

    /**
     * The point of the change: one claim is answered at a time, at whatever
     * length it needs, instead of six competing at a length a tile allows.
     */
    it('shows one answer at a time', () => {
        render(<Features />);

        expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
        expect(
            screen.getByText(
                'Read any board without an account. Posting and commenting need one, and posts are still signed Anonymous.',
            ),
        ).toBeInTheDocument();
    });

    it('answers the claim that was selected', async () => {
        render(<Features />);

        await userEvent.click(
            screen.getByRole('tab', { name: 'Nothing to score' }),
        );

        expect(
            screen.getByText(
                'No votes, no karma, no reputation. A thread rises because anons replied to it, and you can send one to somebody without an account existing anywhere.',
            ),
        ).toBeInTheDocument();
        expect(
            screen.queryByText(/Read any board without an account/),
        ).not.toBeInTheDocument();
    });

    /**
     * Radix drives tabs with a roving tabindex, so the arrow keys are the
     * expected way through a list like this and there is no reason to check
     * the click path only.
     */
    it('moves between claims with the arrow keys', async () => {
        const user = userEvent.setup();

        render(<Features />);

        await user.click(
            screen.getByRole('tab', { name: 'Anonymous by default' }),
        );
        await user.keyboard('{ArrowDown}');

        expect(
            screen.getByRole('tab', { name: 'Fast on purpose' }),
        ).toHaveAttribute('aria-selected', 'true');
    });

    /**
     * The greentext body contains a literal `>` that must survive JSX
     * escaping, since it is the one claim whose subject is the character
     * itself.
     */
    it('keeps the literal > in the greentext body', async () => {
        render(<Features />);

        await userEvent.click(
            screen.getByRole('tab', { name: 'Greentext preserved' }),
        );

        expect(
            screen.getByText(
                'Markdown, quotes and >greentext work the way they always have.',
            ).textContent,
        ).toContain('>greentext');
    });

    /**
     * The band was six bordered tiles on a page whose own rule is that
     * sections are divided by hairlines rather than stacked as slabs.
     */
    it('renders no cards', () => {
        const { container } = render(<Features />);

        expect(container.querySelector('[data-slot="card"]')).toBeNull();
    });

    it('lays the claims beside their answers rather than above them', () => {
        const { container } = render(<Features />);

        expect(
            container.querySelector('[data-slot="tabs"]')?.className,
        ).toMatch(/md:grid-cols-/);
    });

    it('contains no em dashes anywhere in its rendered text', () => {
        const { container } = render(<Features />);

        expect(container.textContent).not.toMatch(/—|--/);
    });
});
