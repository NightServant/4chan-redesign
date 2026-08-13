import { render, screen } from '@testing-library/react';
import type * as MotionReact from 'motion/react';
import { describe, expect, it, vi } from 'vitest';
import { PatternField } from '@/components/clover/pattern-field';

const { useReducedMotion } = vi.hoisted(() => ({
    useReducedMotion: vi.fn().mockReturnValue(false),
}));

vi.mock('motion/react', async () => {
    const actual = await vi.importActual<typeof MotionReact>('motion/react');

    return { ...actual, useReducedMotion };
});

function paper(container: HTMLElement): HTMLElement | null {
    return container.querySelector<HTMLElement>(
        '[data-slot="pattern-field-paper"]',
    );
}

describe('PatternField', () => {
    it('renders its content', () => {
        render(
            <PatternField>
                <p>The same boards.</p>
            </PatternField>,
        );

        expect(screen.getByText('The same boards.')).toBeInTheDocument();
    });

    /**
     * The pattern is paper, not content. Exposed it announces nothing useful
     * and it cannot be interacted with, so it stays out of the accessibility
     * tree and out of the way of pointer events.
     */
    it('keeps the paper out of the accessibility tree and out of hit testing', () => {
        const { container } = render(
            <PatternField>
                <p>content</p>
            </PatternField>,
        );

        expect(paper(container)).toHaveAttribute('aria-hidden', 'true');
        expect(paper(container)?.className).toMatch(/pointer-events-none/);
    });

    /**
     * One pattern, everywhere. There was a ruled grid alternating with this
     * matrix band by band, which made the page two systems rather than one
     * surface. The grid is gone, utility and all, so this asserts the absence
     * as well as the presence.
     */
    it('draws the dot matrix and nothing else', () => {
        const { container } = render(
            <PatternField>
                <p>content</p>
            </PatternField>,
        );

        expect(paper(container)?.className).toMatch(/bg-dots/);
        expect(paper(container)?.className).not.toMatch(/bg-grid/);
    });

    /**
     * The layer moves, so it has to be larger than the band it sits in. Flush
     * to the edges, the first pixel of travel uncovers an unpainted strip at
     * one end, which reads as the pattern peeling away from the band.
     */
    it('overhangs the band by the distance it travels', () => {
        const { container } = render(
            <PatternField depth={80}>
                <p>content</p>
            </PatternField>,
        );

        expect(paper(container)?.style.top).toBe('-80px');
        expect(paper(container)?.style.bottom).toBe('-80px');
    });

    it('paints behind the content rather than over it', () => {
        const { container } = render(
            <PatternField>
                <p>content</p>
            </PatternField>,
        );

        expect(paper(container)?.className).toMatch(/-z-10/);
        expect(
            container.querySelector('[data-slot="pattern-field"]')?.className,
        ).toMatch(/isolate/);
    });

    /**
     * Reduced motion takes the movement, not the pattern. Someone who asked
     * for less motion did not ask for a different design, and the paper is
     * design rather than animation.
     */
    it('keeps the paper and drops the travel under reduced motion', () => {
        useReducedMotion.mockReturnValue(true);

        const { container } = render(
            <PatternField>
                <p>content</p>
            </PatternField>,
        );

        expect(paper(container)?.className).toMatch(/bg-dots/);
        expect(paper(container)?.style.transform ?? '').not.toMatch(
            /translateY\((?!0px\))/,
        );

        useReducedMotion.mockReturnValue(false);
    });

    /**
     * `overflow-hidden` would contain the layer just as well and would make
     * the element a scroll container, which silently breaks `position: sticky`
     * on anything inside it. The app shell wraps every screen in this, and the
     * feed's rail is sticky, so the difference is the feature.
     */
    it('clips without becoming a scroll container', () => {
        const { container } = render(
            <PatternField depth={40}>
                <p>content</p>
            </PatternField>,
        );

        const field = container.querySelector('[data-slot="pattern-field"]');

        expect(field?.className).toMatch(/overflow-clip/);
        expect(field?.className).not.toMatch(/overflow-hidden/);
    });

    /**
     * The clip contains the paper's overhang, and the overhang exists to cover
     * the travel. Pinned, there is neither, and clipping anyway also clips
     * whatever a child positions outside the box.
     *
     * That is not hypothetical: wrapping the app header in a pinned field hid
     * the search dropdown outright, because the list hangs below the header
     * and the clip cut it off. Anything with a popover in it is drawn on
     * pinned paper.
     */
    it('does not clip when the paper is pinned', () => {
        const { container } = render(
            <PatternField depth={0}>
                <p>content</p>
            </PatternField>,
        );

        const field = container.querySelector('[data-slot="pattern-field"]');

        expect(field?.className).not.toMatch(/overflow-clip|overflow-hidden/);
    });
});
