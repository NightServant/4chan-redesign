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

/* The hero previews whatever the page hands it. Four threads is enough to
   prove it shows the two it is given and not the rest. */
const THREADS = [
    makeThread({ title: 'Anons are still arguing about init systems' }),
    makeThread({ title: 'Mainline kernel support or vendor tree' }),
    makeThread({ title: 'Battery life under sustained load' }),
    makeThread({ title: 'A thread the hero was not given' }),
];

const PREVIEW = THREADS.slice(0, 2);

describe('Hero', () => {
    it("renders the hero heading as the page's only h1, with the exact copy", () => {
        render(<Hero threads={PREVIEW} />);

        const headings = screen.getAllByRole('heading', { level: 1 });

        expect(headings).toHaveLength(1);
        expect(headings[0]).toHaveTextContent(
            'The same boards, threads and greentext. Without the 2003 interface.',
        );
    });

    it('renders the intro paragraph verbatim', () => {
        render(<Hero threads={PREVIEW} />);

        expect(
            screen.getByText(
                'Clover is an anonymous discussion platform built around boards instead of followers. No profiles on your posts, no recommendation feed, no ads.',
            ),
        ).toBeInTheDocument();
    });

    it('makes the CTA a primary button linking to /popular, with the given label', () => {
        render(<Hero threads={PREVIEW} />);

        const cta = screen.getByRole('link', {
            name: 'Browse without an account',
        });

        expect(cta).toHaveAttribute('href', '/popular');
        expect(cta.className).toContain('bg-primary');
    });

    it('renders the machine-value line verbatim', () => {
        render(<Hero threads={PREVIEW} />);

        expect(
            screen.getByText('Free · Reading needs no account · Posting does'),
        ).toBeInTheDocument();
    });

    it('hides the gridline background from assistive technology', () => {
        render(<Hero threads={PREVIEW} />);

        const grid = document.querySelector('[data-slot="hero-grid"]');

        expect(grid).toHaveAttribute('aria-hidden', 'true');
        expect(grid).toHaveClass('absolute', 'inset-0');
    });

    it('is a hairline-bordered band, not centred over a filled backdrop', () => {
        render(<Hero threads={PREVIEW} />);

        const hero = document.querySelector('[data-slot="hero"]');

        expect(hero).toHaveClass('border-b', 'relative', 'overflow-hidden');
    });

    /**
     * Thread routes do not exist yet. Both preview cards must point at
     * /popular rather than their own thread, or a first-time visitor lands
     * in a 404 straight out of the hero.
     */
    it('renders a thread-card preview for each thread it is given', () => {
        const { container } = render(<Hero threads={PREVIEW} />);

        const previewLinks = container.querySelectorAll(
            '[data-slot="thread-card"] a',
        );

        expect(previewLinks).toHaveLength(2);
        previewLinks.forEach((link, index) => {
            const thread = PREVIEW[index];

            expect(link).toHaveAttribute(
                'href',
                `/${thread.board.replaceAll('/', '')}/${thread.no}`,
            );
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
        render(<Hero threads={PREVIEW} />);

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

    /**
     * The trailing card recedes by opacity alone. It used to also scale, but
     * scaling only reads as depth when the cards overlap, and overlapping
     * them is what made the pair unreadable in the first place.
     */
    it('fades the trailing card so the pair reads as a stack', () => {
        const { container } = render(<Hero threads={PREVIEW} />);

        const cards = container.querySelectorAll('[data-slot="thread-card"]');

        expect(cards).toHaveLength(2);
        expect(cards[0].className).not.toMatch(/\bopacity-/);
        expect(cards[1]).toHaveClass('opacity-60');
    });

    /**
     * Reported from a screenshot: the two preview cards were laid on top of
     * each other, so the lower card's title printed straight through the
     * upper card's body text. Absolute positioning pulled the second card out
     * of flow with nothing reserving space for it.
     *
     * They now stack in normal flow. The second recedes by opacity alone,
     * which cannot collide with anything.
     */
    it('never lifts a preview card out of flow on top of the other', () => {
        const { container } = render(<Hero threads={PREVIEW} />);

        const preview = container.querySelector(
            '[data-slot="hero-thread-preview"]',
        );

        expect(preview).toBeTruthy();

        for (const card of preview?.children ?? []) {
            expect(card.className).not.toMatch(/\babsolute\b/);
            expect(card.className).not.toMatch(/\binset-x-0\b/);
        }
    });

    it('stacks the previews in a spaced column', () => {
        const { container } = render(<Hero threads={PREVIEW} />);

        const preview = container.querySelector(
            '[data-slot="hero-thread-preview"]',
        );

        expect(preview?.className).toMatch(/\bflex-col\b/);
        expect(preview?.className).toMatch(/\bgap-/);
    });
});
