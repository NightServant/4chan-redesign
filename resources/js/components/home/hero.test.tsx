import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Hero } from '@/components/home/hero';
import { makeThread } from '@/fixtures/factories';

/**
 * `Link` needs an Inertia page context that only exists inside
 * `createInertiaApp`. Replaced with a plain anchor so the DOM stays
 * queryable by role, matching `thread-card.test.tsx` and `top-nav.test.tsx`.
 */
vi.mock('@inertiajs/react', () => ({
    Link: ({
        href,
        children,
        ...props
    }: {
        href: string | { url: string };
        children: ReactNode;
    } & Record<string, unknown>) => {
        const url = typeof href === 'string' ? href : href.url;

        return (
            <a href={url} {...props}>
                {children}
            </a>
        );
    },
}));

const THREADS = [
    makeThread({ title: 'Anons are still arguing about init systems' }),
    makeThread({ title: 'Mainline kernel support or vendor tree' }),
    makeThread({ title: 'Battery life under sustained load' }),
    makeThread({ title: 'Wallpaper thread, 4K only' }),
];

const HEADLINE = 'The same boards. Without the 2003 interface.';

/**
 * `BlurText` renders one flex item per word and joins them with U+00A0,
 * because an ordinary space between flex items collapses to nothing. What a
 * reader sees is the headline; what `textContent` returns is the headline with
 * non-breaking spaces, so it is normalised before comparison.
 */
function visibleText(el: HTMLElement): string {
    return (el.textContent ?? '').replace(/\u00a0/g, ' ');
}

describe('Hero', () => {
    /**
     * The heading is split into one span per word by `BlurText`, so its text
     * arrives in fragments and `getByText` on the whole string will not match.
     * `textContent` on the heading is what a reader actually ends up with, and
     * asserting that keeps the test honest about the animation being cosmetic.
     */
    it("renders the headline as the page's only h1, with the exact copy", () => {
        render(<Hero threads={THREADS} />);

        const headings = screen.getAllByRole('heading', { level: 1 });

        expect(headings).toHaveLength(1);
        expect(visibleText(headings[0])).toBe(HEADLINE);
    });

    it('renders the intro paragraph verbatim', () => {
        render(<Hero threads={THREADS} />);

        expect(
            screen.getByText(
                'Anonymous discussion, organised by board. No profiles, no algorithm, no ads.',
            ),
        ).toBeInTheDocument();
    });

    it('makes the CTA a primary button linking to /popular, with the given label', () => {
        render(<Hero threads={THREADS} />);

        expect(
            screen.getByRole('link', { name: 'Browse without an account' }),
        ).toHaveAttribute('href', '/popular');
    });

    it('renders the machine-value line verbatim', () => {
        render(<Hero threads={THREADS} />);

        expect(
            screen.getByText('Free · Reading needs no account'),
        ).toBeInTheDocument();
    });

    /**
     * The band was a split composition over a ruled grid drawn in repeating
     * gradients. The grid is gone: the design system says backgrounds are
     * flat, and a repeating gradient is a pattern however faintly it is drawn.
     */
    it('paints no gridlines or other pattern behind itself', () => {
        const { container } = render(<Hero threads={THREADS} />);

        expect(
            container.querySelector('[data-slot="hero-grid"]'),
        ).not.toBeInTheDocument();

        for (const el of container.querySelectorAll<HTMLElement>('*')) {
            expect(el.style.backgroundImage).toBe('');
        }
    });

    it('is a hairline-bordered band, not centred over a filled backdrop', () => {
        const { container } = render(<Hero threads={THREADS} />);

        const hero = container.querySelector('[data-slot="hero"]');

        expect(hero?.className).toMatch(/border-b/);
        expect(hero?.className).not.toMatch(/bg-(primary|surface-elevated)/);
    });

    /** Two rails, and every thread the hero was given lands in one of them. */
    it('splits its threads across two rails travelling in opposition', () => {
        const { container } = render(<Hero threads={THREADS} />);

        const rails = container.querySelectorAll(
            '[data-slot="thread-marquee"]',
        );

        expect(rails).toHaveLength(2);

        for (const thread of THREADS) {
            expect(screen.getAllByText(thread.title).length).toBeGreaterThan(0);
        }
    });

    /**
     * Two rails at the same speed in opposite directions read as one
     * mechanism. The point of the pair is that they drift, so the durations
     * must not match.
     */
    it('runs the two rails at different speeds', () => {
        const { container } = render(<Hero threads={THREADS} />);

        const durations = [
            ...container.querySelectorAll<HTMLElement>(
                '[data-slot="thread-marquee-track"]',
            ),
        ].map((track) => track.style.animationDuration);

        expect(durations).toHaveLength(2);
        expect(durations[0]).not.toBe(durations[1]);
        expect(durations.every((d) => d !== '')).toBe(true);
    });

    /**
     * The rails are decoration made of real content, and the content is
     * rendered twice to make the loop seamless. Exposed, that is a wall of
     * duplicated titles between a visitor and the only button on the page.
     */
    it('keeps both rails out of the accessibility tree and the tab order', () => {
        const { container } = render(<Hero threads={THREADS} />);

        for (const rail of container.querySelectorAll(
            '[data-slot="thread-marquee"]',
        )) {
            expect(rail).toHaveAttribute('aria-hidden', 'true');
            expect(rail.hasAttribute('inert')).toBe(true);
        }
    });

    /** The rails have no room on a phone, and texture must not precede the pitch. */
    it('hides the rails below the large breakpoint', () => {
        const { container } = render(<Hero threads={THREADS} />);

        for (const rail of container.querySelectorAll(
            '[data-slot="thread-marquee"]',
        )) {
            expect(rail.className).toMatch(/\bhidden\b/);
            expect(rail.className).toMatch(/lg:block/);
        }
    });

    /**
     * Before the first sync there are no threads. The pitch has to stand on
     * its own rather than the band collapsing or rendering empty rails.
     */
    it('still renders the pitch when there are no threads to show', () => {
        const { container } = render(<Hero threads={[]} />);

        expect(visibleText(screen.getByRole('heading', { level: 1 }))).toBe(
            HEADLINE,
        );
        expect(
            screen.getByRole('link', { name: 'Browse without an account' }),
        ).toBeInTheDocument();
        expect(
            container.querySelectorAll('[data-slot="thread-marquee"]'),
        ).toHaveLength(0);
    });

    /**
     * The rails are not `ThreadCard`s. A card brings a share button and a
     * bookmark button, and sixteen of them sliding past the pitch would put
     * thirty-two controls behind an `inert` wrapper.
     */
    it('renders no thread cards or controls in the rails', () => {
        const { container } = render(<Hero threads={THREADS} />);

        expect(
            container.querySelector('[data-slot="thread-card"]'),
        ).not.toBeInTheDocument();
        expect(screen.queryAllByRole('button')).toHaveLength(0);
    });
});
