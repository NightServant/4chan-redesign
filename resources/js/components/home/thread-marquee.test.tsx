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

    /**
     * Speed is a rate now, not a duration. It used to take `seconds` for one
     * full pass, which sounds equivalent and is not: the same duration over
     * more rows is a faster rail, so adding threads silently changed the speed
     * of every rail showing them. The duration is derived from the measured
     * content, so it always carries one.
     */
    it('derives a duration from the rate it was given', () => {
        const { container } = render(
            <ThreadMarquee threads={THREADS} pixelsPerSecond={90} />,
        );

        const track = container.querySelector<HTMLElement>(
            '[data-slot="thread-marquee-track"]',
        );

        expect(track?.style.animationDuration).toMatch(/^[\d.]+s$/);
    });

    /**
     * jsdom lays nothing out, so the measured content is 0 and the component
     * falls back to an assumed distance. Halving the rate must still double
     * the duration, which is the relationship the whole change is about.
     */
    it('runs twice as long at half the rate', () => {
        const durationAt = (rate: number): number => {
            const { container, unmount } = render(
                <ThreadMarquee threads={THREADS} pixelsPerSecond={rate} />,
            );

            const track = container.querySelector<HTMLElement>(
                '[data-slot="thread-marquee-track"]',
            );
            const seconds = Number.parseFloat(
                track?.style.animationDuration ?? '0',
            );

            unmount();

            return seconds;
        };

        expect(durationAt(50)).toBeCloseTo(durationAt(100) * 2, 1);
    });

    /**
     * Task 13. Gabe's homepage at ~340px: a 320px card inside a band whose
     * window is about the width of the viewport itself — the ticker is
     * `-mx-6` and so spans past the section's own padding — means no whole
     * card is ever on screen. His shots show a title cut at the right edge and
     * another cut at the left, at all times, with nothing whole between them.
     *
     * The component's docblock argues that a clipped row "reads as a cell
     * passing a window rather than as a clipping bug", and that holds at
     * desktop widths where a whole card plus part of the next is visible. It
     * does not hold when nothing whole ever fits.
     *
     * 232px is the answer, and the "one whole card fits" half of it is
     * arithmetic rather than a measurement: against roughly 318px of window at
     * a 320px viewport it leaves 86px of the following card showing, and even
     * against the narrower 272px reading (were the `-mx-6` ever dropped) it
     * still leaves 40px. jsdom lays none of this out, so what is guarded is the
     * pair of classes.
     */
    it('narrows the ticker card below `sm` so one fits whole, and restores it above', () => {
        const { container } = render(
            <ThreadMarquee threads={[THREADS[0]]} axis="x" />,
        );

        const row = container.querySelector<HTMLElement>(
            '[data-slot="thread-marquee-row"]',
        );

        expect(row?.className).toMatch(/(^|\s)w-\[232px\](\s|$)/);
        expect(row?.className).toMatch(/(^|\s)sm:w-\[320px\](\s|$)/);
        expect(row?.className).not.toMatch(/(^|\s)w-\[320px\](\s|$)/);
    });

    /**
     * The vertical rails do not have this problem and are not touched. A `y`
     * row takes the width of the rail it is in, and the rails themselves are
     * `hidden lg:block` — they do not exist at any width where this could
     * bite.
     */
    it('leaves the vertical row without a fixed width', () => {
        const { container } = render(
            <ThreadMarquee threads={[THREADS[0]]} axis="y" />,
        );

        const row = container.querySelector<HTMLElement>(
            '[data-slot="thread-marquee-row"]',
        );

        expect(row?.className).not.toMatch(/w-\[/);
    });

    /** A ticker travels sideways, and needs its own keyframes to do it. */
    it('travels along the axis it was given', () => {
        const { container } = render(
            <ThreadMarquee threads={THREADS} axis="x" />,
        );

        const track = container.querySelector<HTMLElement>(
            '[data-slot="thread-marquee-track"]',
        );

        expect(track?.className).toMatch(/animate-thread-marquee-x/);
        /* Lookahead rather than a word boundary: `\b` sits happily between
           the `e` and the `-`, so it matches the horizontal class too. */
        expect(track?.className).not.toMatch(/animate-thread-marquee(?!-x)/);
    });

    /**
     * The duration used to be published as a `--marquee-duration` custom
     * property that the animation shorthand never picked up, so every rail ran
     * at the 90s fallback while the source looked correct.
     */
    it('does not rely on a custom property to carry its duration', () => {
        const { container } = render(
            <ThreadMarquee threads={THREADS} pixelsPerSecond={90} />,
        );

        const track = container.querySelector<HTMLElement>(
            '[data-slot="thread-marquee-track"]',
        );

        expect(track?.style.getPropertyValue('--marquee-duration')).toBe('');
        expect(track?.style.animationDuration).not.toBe('');
    });

    it('reverses rather than reordering when sent backwards', () => {
        const { container } = render(
            <ThreadMarquee threads={THREADS} direction="reverse" />,
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

    /**
     * The rail was masked at both ends so it read as continuing past its edge.
     * The cost was that rows entering and leaving were half-legible for most
     * of the time they were on screen, on a rail whose entire purpose is
     * showing real thread titles.
     */
    it('fades nothing, so every row on screen is legible', () => {
        const { container } = render(<ThreadMarquee threads={THREADS} />);

        const rail = container.querySelector<HTMLElement>(
            '[data-slot="thread-marquee"]',
        );

        expect(rail?.style.maskImage ?? '').toBe('');
        expect(rail?.style.webkitMaskImage ?? '').toBe('');
    });

    it('boxes every row rather than ruling between them', () => {
        const { container } = render(<ThreadMarquee threads={THREADS} />);

        const rows = container.querySelectorAll<HTMLElement>(
            '[data-slot="thread-marquee-track"] > div > div',
        );

        expect(rows.length).toBeGreaterThan(0);

        for (const row of rows) {
            expect(row.className).toMatch(/border-b/);
            expect(row.className).toMatch(/border-t/);
        }
    });

    /** The title is the row, so it carries the page's text colour, not a muted one. */
    it('renders titles at full strength', () => {
        render(<ThreadMarquee threads={THREADS} />);

        const title = screen.getAllByText(THREADS[0].title)[0];

        expect(title.className).toMatch(/text-foreground/);
        expect(title.className).not.toMatch(/text-muted-foreground|text-faint/);
    });

    it('renders nothing at all before the first sync', () => {
        const { container } = render(<ThreadMarquee threads={[]} />);

        expect(container).toBeEmptyDOMElement();
    });
});
