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

    /**
     * Task 13, the third of the three homepage bands brought onto one ruled
     * grid. It ruled each step with a `border-t` above it in
     * `border-border-strong`, which is a heavier hairline than anything else on
     * the page draws, and the steps then floated apart on a `gap-5` so their
     * lines never met.
     *
     * The pattern is the features and trending bands': cells ruled on both
     * axes, every interior line drawn once, `border-border` throughout.
     */
    it('rules the steps as grid cells on both axes', () => {
        const { container } = render(<HowItWorks />);

        const frame = container.querySelector<HTMLElement>(
            '[data-slot="how-it-works-frame"]',
        );
        const list = screen.getByRole('list');

        /* The frame draws the bottom rule only: the section's own `border-x`
           draws the two verticals, and the grid draws its top. */
        expect(frame?.className).toMatch(/(^|\s)border-b(\s|$)/);
        expect(frame?.className).not.toMatch(/(^|\s)border(\s|$)/);
        expect(frame?.className).not.toMatch(/(^|\s)border-l(\s|$)/);
        expect(frame?.className).not.toMatch(/(^|\s)border-r(\s|$)/);
        expect(frame?.className).toMatch(/(^|\s)-ml-6(\s|$)/);
        expect(frame?.className).toMatch(/(^|\s)-mr-\[25px\](\s|$)/);
        expect(list.className).toMatch(/(^|\s)border-t(\s|$)/);
        expect(list.className).not.toMatch(/gap-/);

        for (const step of screen.getAllByRole('listitem')) {
            expect(step.className).toMatch(/(^|\s)border-r(\s|$)/);
            expect(step.className).toMatch(/(^|\s)border-b(\s|$)/);
            expect(step.className).not.toMatch(/(^|\s)border-t(\s|$)/);
            expect(step.className).not.toMatch(/border-border-strong/);
            expect(step.className).toMatch(/(^|\s)p-6(\s|$)/);
        }
    });

    /**
     * The band's column count is an `auto-fit` track rather than a pair of
     * breakpoints, so nothing here can count the columns and pad a short last
     * row the way the trending list does. The frame draws the outer box
     * instead, and the grid is pulled a pixel into it so the last row's own
     * right and bottom rules land exactly on the frame's rather than beside
     * them. A short row then still meets a full-width bottom rule.
     */
    it('closes a short last row with the frame rather than by counting columns', () => {
        render(<HowItWorks />);

        const list = screen.getByRole('list');

        expect(list.className).toMatch(/(^|\s)-mb-px(\s|$)/);
    });

    /**
     * `min(260px, 100%)`, not a bare 260px minimum. A bare pixel minimum
     * overflows a 320px viewport, which is the defect task 1 of this branch
     * existed to fix across four files, and `responsive.test.ts` scans for it.
     * The rules changed; the track did not.
     */
    it('keeps the collapsible track that survives a 320px viewport', () => {
        render(<HowItWorks />);

        expect(screen.getByRole('list').getAttribute('style')).toContain(
            'minmax(min(260px, 100%), 1fr)',
        );
    });

    it('contains no em dashes anywhere in its rendered text', () => {
        const { container } = render(<HowItWorks />);

        expect(container.textContent).not.toMatch(/—|--/);
    });
});
