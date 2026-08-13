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

    /**
     * Found rather than got: the answers are swapped through `AnimatePresence`
     * with `mode="wait"`, so the outgoing one leaves before the incoming one
     * mounts and the new copy is not in the document on the tick the click
     * resolves.
     */
    it('answers the claim that was selected', async () => {
        render(<Features />);

        await userEvent.click(
            screen.getByRole('tab', { name: 'Nothing to score' }),
        );

        expect(
            await screen.findByText(
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

        const body = await screen.findByText(
            'Markdown, quotes and >greentext work the way they always have.',
        );

        expect(body.textContent).toContain('>greentext');
    });

    /**
     * The band was six bordered tiles on a page whose own rule is that
     * sections are divided by hairlines rather than stacked as slabs.
     */
    it('renders no cards', () => {
        const { container } = render(<Features />);

        expect(container.querySelector('[data-slot="card"]')).toBeNull();
    });

    /**
     * Equal halves, not a narrow rail beside a wide panel. The claims are half
     * the argument rather than a table of contents for it, and sizing them the
     * same is what says so.
     */
    it('gives the claims and their answers equal halves', () => {
        const { container } = render(<Features />);

        expect(
            container.querySelector('[data-slot="tabs"]')?.className,
        ).toMatch(/md:grid-cols-2\b/);
    });

    /**
     * A rule between the claims and their answer, not a gap. Whitespace reads
     * as two lists that happen to be adjacent; this pair is one control and
     * its output. Carried by the list's own right edge so a single line falls
     * between the columns rather than two meeting in the gutter.
     */
    it('divides the claims from their answer with a rule', () => {
        const { container } = render(<Features />);

        const list = container.querySelector<HTMLElement>(
            '[data-slot="tabs-list"]',
        );

        expect(list?.className).toMatch(/md:border-r/);
        expect(
            container.querySelector('[data-slot="tabs"]')?.className,
        ).toMatch(/md:gap-0/);
    });

    it('contains no em dashes anywhere in its rendered text', () => {
        const { container } = render(<Features />);

        expect(container.textContent).not.toMatch(/—|--/);
    });
});
