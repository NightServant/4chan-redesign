import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { makeBoard, makeThread, makeTrendingTag } from '@/fixtures/factories';
import Welcome from '@/pages/welcome';
import type { User } from '@/types/auth';

/**
 * Page-level tests for the composed homepage. Each band is tested in its own
 * file; what is only checkable here is how they fit together: heading order
 * across the whole document, the landmark skeleton, and whether any link on
 * the one page a first-time visitor sees leads nowhere.
 */
const mockPage: { props: { auth: { user: User | null } }; url: string } = {
    props: { auth: { user: null } },
    url: '/',
};

vi.mock('@inertiajs/react', () => ({
    usePage: () => mockPage,
    Head: () => null,
    Link: ({
        href,
        children,
        ...props
    }: {
        href: string | { url: string };
        children: ReactNode;
    } & Record<string, unknown>) => (
        <a href={typeof href === 'string' ? href : href.url} {...props}>
            {children}
        </a>
    ),
}));

/* What HomeController sends: boards for the grid, threads for the hero and
   the trending strip, and the busiest boards for the strip's chips. */
const BOARDS = [
    makeBoard({ slug: '/g/', name: 'Technology' }),
    makeBoard({ slug: '/biz/', name: 'Business' }),
];

const THREADS = [
    makeThread({ title: 'Anons are still arguing about init systems' }),
    makeThread({
        title: 'A thread title with an em dash — because anons write them',
        excerpt: 'Body copy an anon wrote, dashes and all.',
    }),
    makeThread({ title: 'Battery life under sustained load' }),
];

const TRENDING = [makeTrendingTag({ tag: '/g/', posts: '4,182 posts' })];

describe('Welcome', () => {
    it('has exactly one first-level heading', () => {
        render(
            <Welcome boards={BOARDS} threads={THREADS} trending={TRENDING} />,
        );

        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    });

    /**
     * A document that jumps h1 to h3 leaves a screen-reader user unable to
     * tell whether they missed a section.
     */
    it('steps heading levels without skipping one', () => {
        render(
            <Welcome boards={BOARDS} threads={THREADS} trending={TRENDING} />,
        );

        const levels = screen
            .getAllByRole('heading')
            .map((heading) => Number(heading.tagName.slice(1)));

        expect(levels[0]).toBe(1);

        for (let i = 1; i < levels.length; i++) {
            expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
        }
    });

    it('lays out the page as banner, main and contentinfo landmarks', () => {
        render(
            <Welcome boards={BOARDS} threads={THREADS} trending={TRENDING} />,
        );

        expect(screen.getByRole('banner')).toBeInTheDocument();
        expect(screen.getByRole('main')).toBeInTheDocument();
        expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });

    /**
     * This is the one page a first-time visitor sees. A link that goes nowhere
     * here is worse than a missing feature: it reads as a broken product.
     */
    it('points every link at a real path', () => {
        render(
            <Welcome boards={BOARDS} threads={THREADS} trending={TRENDING} />,
        );

        const links = screen.getAllByRole('link');

        expect(links.length).toBeGreaterThan(10);

        for (const link of links) {
            const href = link.getAttribute('href');

            expect(href, `${link.textContent} has no href`).toBeTruthy();
            expect(href, `${link.textContent} links to a fragment`).not.toBe(
                '#',
            );
            expect(
                href?.startsWith('/'),
                `${link.textContent} links to ${href}`,
            ).toBe(true);
        }
    });

    /**
     * Thread routes exist now, so the guard inverts: a card must point at its
     * own thread rather than at the feed. What it is really protecting is that
     * every link resolves, which is why it checks the shape against the boards
     * the page was given rather than merely that the href is non-empty.
     */
    it('links thread cards at real thread routes', () => {
        render(
            <Welcome boards={BOARDS} threads={THREADS} trending={TRENDING} />,
        );

        const threadLinks = screen
            .getAllByRole('link')
            .map((link) => link.getAttribute('href') ?? '')
            .filter((href) => /^\/[a-z0-9]+\/\d+$/.test(href));

        expect(threadLinks.length).toBeGreaterThan(0);

        for (const href of threadLinks) {
            expect(href).toMatch(/^\/(g|biz)\/\d+$/);
        }
    });

    /**
     * The no-em-dash rule governs copy Clover writes, not content it is
     * pretending an anon typed — and now, copy anons actually did type. One of
     * the threads above carries an em dash deliberately, because ingested
     * titles are real user text and real people use them. Thread strings are
     * removed before asserting, which keeps the guard on the marketing copy
     * where the rule applies.
     */
    it('contains no em dashes in copy Clover wrote', () => {
        const { container } = render(
            <Welcome boards={BOARDS} threads={THREADS} trending={TRENDING} />,
        );

        const authored = THREADS.reduce(
            (text, thread) =>
                text
                    .replaceAll(thread.title, '')
                    .replaceAll(thread.excerpt ?? '', ''),
            container.textContent ?? '',
        );

        expect(authored).not.toMatch(/—|–|--/);
    });
});
