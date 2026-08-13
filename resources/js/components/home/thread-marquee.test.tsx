import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThreadMarquee } from '@/components/home/thread-marquee';
import { makeThread } from '@/fixtures/factories';

const THREADS = [
    makeThread({ title: 'Anons are still arguing about init systems' }),
    makeThread({ title: 'Mainline kernel support or vendor tree' }),
];

describe('ThreadMarquee', () => {
    /**
     * The duplicate is the mechanism, not an accident. The track travels
     * exactly half its own height, so the second copy has to be sitting where
     * the first one started or the loop visibly jumps.
     */
    it('renders its threads twice so the loop has no seam', () => {
        render(<ThreadMarquee threads={THREADS} />);

        for (const thread of THREADS) {
            expect(screen.getAllByText(thread.title)).toHaveLength(2);
        }
    });

    it('shows the board, the title and the reply count for each row', () => {
        render(<ThreadMarquee threads={[THREADS[0]]} />);

        expect(screen.getAllByText(THREADS[0].board).length).toBeGreaterThan(0);
        expect(screen.getAllByText(THREADS[0].title).length).toBeGreaterThan(0);
        expect(
            screen.getAllByText(`${THREADS[0].replies} replies`).length,
        ).toBeGreaterThan(0);
    });

    /**
     * Duplicated content read aloud is the same title twice, and the rows are
     * decoration: everything in them is reachable from the feed. `inert` has
     * to travel with `aria-hidden`, since `aria-hidden` alone would leave any
     * focusable child reachable but unannounced.
     */
    it('is hidden from assistive technology and removed from the tab order', () => {
        const { container } = render(<ThreadMarquee threads={THREADS} />);

        const rail = container.querySelector('[data-slot="thread-marquee"]');

        expect(rail).toHaveAttribute('aria-hidden', 'true');
        expect(rail?.hasAttribute('inert')).toBe(true);
    });

    it('carries the duration it was given rather than the stylesheet default', () => {
        const { container } = render(
            <ThreadMarquee threads={THREADS} seconds={42} />,
        );

        const track = container.querySelector<HTMLElement>(
            '[data-slot="thread-marquee-track"]',
        );

        expect(track?.style.animationDuration).toBe('42s');
    });

    /**
     * The duration used to be published as a `--marquee-duration` custom
     * property that the animation shorthand never picked up, so every rail ran
     * at the 90s fallback while the source looked correct.
     */
    it('does not rely on a custom property to carry its duration', () => {
        const { container } = render(
            <ThreadMarquee threads={THREADS} seconds={42} />,
        );

        const track = container.querySelector<HTMLElement>(
            '[data-slot="thread-marquee-track"]',
        );

        expect(track?.style.getPropertyValue('--marquee-duration')).toBe('');
        expect(track?.style.animationDuration).not.toBe('');
    });

    it('reverses rather than reordering when sent downward', () => {
        const { container } = render(
            <ThreadMarquee threads={THREADS} direction="down" />,
        );

        const track = container.querySelector<HTMLElement>(
            '[data-slot="thread-marquee-track"]',
        );

        expect(track?.style.animationDirection).toBe('reverse');
        /* Still in source order: the reversal is the animation's, so the list
           does not have to be built backwards to travel backwards. */
        expect(screen.getAllByText(THREADS[0].title).length).toBe(2);
    });

    /**
     * The global reduced-motion rule collapses durations to almost nothing,
     * which for a looping translate parks the track at its end frame instead
     * of stopping it. This turns the animation off outright.
     */
    it('stops rather than races when the reader asked for less motion', () => {
        const { container } = render(<ThreadMarquee threads={THREADS} />);

        const track = container.querySelector<HTMLElement>(
            '[data-slot="thread-marquee-track"]',
        );

        expect(track?.className).toMatch(/motion-reduce:animate-none/);
    });

    /** A row a visitor has started reading should not slide out from under them. */
    it('pauses while hovered', () => {
        const { container } = render(<ThreadMarquee threads={THREADS} />);

        const track = container.querySelector<HTMLElement>(
            '[data-slot="thread-marquee-track"]',
        );

        expect(track?.className).toMatch(/animation-play-state:paused/);
    });

    it('renders nothing at all before the first sync', () => {
        const { container } = render(<ThreadMarquee threads={[]} />);

        expect(container).toBeEmptyDOMElement();
    });
});
