import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Hero } from '@/components/home/hero';
import { THREADS } from '@/fixtures/clover';

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

describe('Hero', () => {
    it("renders the hero heading as the page's only h1, with the exact copy", () => {
        render(<Hero />);

        const headings = screen.getAllByRole('heading', { level: 1 });

        expect(headings).toHaveLength(1);
        expect(headings[0]).toHaveTextContent(
            'The same boards, threads and greentext. Without the 2003 interface.',
        );
    });

    it('renders the intro paragraph verbatim', () => {
        render(<Hero />);

        expect(
            screen.getByText(
                'Clover is an anonymous discussion platform built around boards instead of followers. No profiles on your posts, no recommendation feed, no ads.',
            ),
        ).toBeInTheDocument();
    });

    it('makes the CTA a primary button linking to /popular, with the given label', () => {
        render(<Hero />);

        const cta = screen.getByRole('link', {
            name: 'Browse without an account',
        });

        expect(cta).toHaveAttribute('href', '/popular');
        expect(cta.className).toContain('bg-primary');
    });

    it('renders the machine-value line verbatim', () => {
        render(<Hero />);

        expect(
            screen.getByText(
                'Free · Reading needs no account · Posting does · 74 boards',
            ),
        ).toBeInTheDocument();
    });

    it('hides the gridline background from assistive technology', () => {
        render(<Hero />);

        const grid = document.querySelector('[data-slot="hero-grid"]');

        expect(grid).toHaveAttribute('aria-hidden', 'true');
        expect(grid).toHaveClass('absolute', 'inset-0');
    });

    it('is a hairline-bordered band, not centred over a filled backdrop', () => {
        render(<Hero />);

        const hero = document.querySelector('[data-slot="hero"]');

        expect(hero).toHaveClass('border-b', 'relative', 'overflow-hidden');
    });

    /**
     * Thread routes do not exist yet. Both preview cards must point at
     * /popular rather than their own thread, or a first-time visitor lands
     * in a 404 straight out of the hero.
     */
    it('renders two thread-card previews, both pointing at /popular rather than a thread route', () => {
        const { container } = render(<Hero />);

        const previewLinks = container.querySelectorAll(
            '[data-slot="thread-card"] a',
        );

        expect(previewLinks).toHaveLength(2);
        previewLinks.forEach((link) => {
            expect(link).toHaveAttribute('href', '/popular');
        });
    });

    /**
     * Two full thread cards (title link, vote buttons, bookmark button) are
     * noise for a screen reader in the middle of a marketing hero, and
     * giving both the same /popular destination would present a keyboard
     * user with two indistinguishable links. The whole preview stack is
     * taken out of the accessibility tree and the tab order rather than
     * exposing either card's controls.
     */
    it('removes the preview stack from the accessibility tree and the tab order', () => {
        render(<Hero />);

        const preview = document.querySelector(
            '[data-slot="hero-thread-preview"]',
        );

        expect(preview).toHaveAttribute('aria-hidden', 'true');
        expect(preview).toHaveAttribute('inert');

        expect(
            screen.queryByRole('link', { name: THREADS[0].title }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: THREADS[3].title }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /bless this post/i }),
        ).not.toBeInTheDocument();
    });

    it('scales and fades the trailing card so the pair reads as a stack, without animating layout', () => {
        const { container } = render(<Hero />);

        const cards = container.querySelectorAll('[data-slot="thread-card"]');

        expect(cards).toHaveLength(2);
        expect(cards[1]).toHaveClass('scale-[0.96]', 'opacity-82');
    });
});
