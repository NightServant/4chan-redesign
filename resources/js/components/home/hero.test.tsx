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

describe('Hero', () => {
    it("renders the headline as the page's only h1, with the exact copy", () => {
        render(<Hero threads={THREADS} boardCount={53} />);

        const headings = screen.getAllByRole('heading', { level: 1 });

        expect(headings).toHaveLength(1);
        expect(headings[0]).toHaveTextContent(HEADLINE);
    });

    /**
     * One sentence to a line, so the break never lands inside "the 2003
     * interface". Each line settles in word by word, so every word is its own
     * element; the words are joined with U+00A0, normalised here.
     */
    it('sets each sentence on its own line, settling in word by word', () => {
        render(<Hero threads={THREADS} boardCount={53} />);

        const heading = screen.getByRole('heading', { level: 1 });
        const lines = [...heading.children];

        expect(
            lines.map((line) => line.textContent?.replace(/\u00a0/g, ' ')),
        ).toEqual(['The same boards.', 'Without the 2003 interface.']);
        lines.forEach((line) => expect(line).toHaveClass('flex', 'flex-wrap'));
        /* "2003 interface." moves as one, so it never breaks apart. */
        expect(lines.map((line) => line.children.length)).toEqual([3, 3]);
    });

    /**
     * Green on dark paper, as type rather than as a fill; near-black on light
     * paper, like every other heading.
     */
    it('sets the headline green in the dark theme only', () => {
        render(<Hero threads={THREADS} boardCount={53} />);

        const heading = screen.getByRole('heading', { level: 1 });

        expect(heading).toHaveClass('text-foreground', 'dark:text-primary');
        expect(heading).not.toHaveClass('text-primary');
        expect(heading.className).not.toMatch(/\bbg-/);
    });

    /**
     * Left-aligned like every band below it, centred top to bottom in the
     * space above the terms, which are ruled off at the foot with the rule
     * meeting the rails.
     */
    it('reads left to right, centred above the terms ruled off beneath', () => {
        render(<Hero threads={THREADS} boardCount={53} />);

        const heading = screen.getByRole('heading', { level: 1 });
        const pitch = heading.parentElement;
        const cell = pitch?.parentElement;
        const terms = screen.getByText(
            '53 boards · Free · Reading needs no account',
        );

        expect(cell?.className).not.toMatch(/text-center|items-center/);
        expect(cell).toHaveClass('flex-col', 'lg:px-10');
        expect(pitch).toHaveClass('lg:my-auto');
        expect(terms.parentElement).toHaveClass(
            'border-t',
            '-mx-6',
            'lg:-mx-10',
        );
        expect(terms).toHaveClass('text-muted-foreground');
    });

    it('renders the intro paragraph verbatim', () => {
        render(<Hero threads={THREADS} boardCount={53} />);

        expect(
            screen.getByText(
                'Anonymous discussion, organised by board. No profiles, no algorithm, no ads.',
            ),
        ).toBeInTheDocument();
    });

    /**
     * The call to action moved to the closing band (`CtaBand`), so the pitch
     * makes its case and leaves the invitation to the end of the page.
     */
    it('carries no browse link or button; the closing band owns that call', () => {
        render(<Hero threads={THREADS} boardCount={53} />);

        for (const role of ['link', 'button'] as const) {
            expect(
                screen.queryByRole(role, { name: 'Browse without an account' }),
            ).not.toBeInTheDocument();
        }
    });

    /** The count is the visitor's own, passed down rather than written in. */
    it('counts the boards it was given in the machine-value line', () => {
        render(<Hero threads={THREADS} boardCount={1234} />);

        expect(
            screen.getByText('1,234 boards · Free · Reading needs no account'),
        ).toBeInTheDocument();
    });

    /**
     * The band was a split composition over a ruled grid drawn in repeating
     * gradients. The grid is gone: the design system says backgrounds are
     * flat, and a repeating gradient is a pattern however faintly it is drawn.
     */
    it('paints no gridlines or other pattern behind itself', () => {
        const { container } = render(
            <Hero threads={THREADS} boardCount={53} />,
        );

        expect(
            container.querySelector('[data-slot="hero-grid"]'),
        ).not.toBeInTheDocument();

        for (const el of container.querySelectorAll<HTMLElement>('*')) {
            expect(el.style.backgroundImage).toBe('');
        }
    });

    it('is a hairline-bordered band, not centred over a filled backdrop', () => {
        const { container } = render(
            <Hero threads={THREADS} boardCount={53} />,
        );

        const hero = container.querySelector('[data-slot="hero"]');

        expect(hero?.className).toMatch(/border-b/);
        expect(hero?.className).not.toMatch(/bg-(primary|surface-elevated)/);
    });

    /** Two rails, and every thread the hero was given lands in one of them. */
    it('splits its threads across two rails travelling in opposition', () => {
        const { container } = render(
            <Hero threads={THREADS} boardCount={53} />,
        );

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
        const { container } = render(
            <Hero threads={THREADS} boardCount={53} />,
        );

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
     * duplicated titles between a visitor and the pitch.
     */
    it('keeps both rails out of the accessibility tree and the tab order', () => {
        const { container } = render(
            <Hero threads={THREADS} boardCount={53} />,
        );

        for (const rail of container.querySelectorAll(
            '[data-slot="thread-marquee"]',
        )) {
            expect(rail).toHaveAttribute('aria-hidden', 'true');
            expect(rail.hasAttribute('inert')).toBe(true);
        }
    });

    /** The rails have no room on a phone, and texture must not precede the pitch. */
    it('hides the rails below the large breakpoint', () => {
        const { container } = render(
            <Hero threads={THREADS} boardCount={53} />,
        );

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
        const { container } = render(<Hero threads={[]} boardCount={53} />);

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
            HEADLINE,
        );
        expect(
            screen.getByText('53 boards · Free · Reading needs no account'),
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
        const { container } = render(
            <Hero threads={THREADS} boardCount={53} />,
        );

        expect(
            container.querySelector('[data-slot="thread-card"]'),
        ).not.toBeInTheDocument();
        expect(screen.queryAllByRole('button')).toHaveLength(0);
    });
});
