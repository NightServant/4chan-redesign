import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { makeBoard, makeThread, makeTrendingTag } from '@/fixtures/factories';
import { HOME_SECTION_IDS } from '@/lib/home-sections';
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
     * The homepage no longer links to an individual thread, and that is a
     * deliberate trade rather than an oversight.
     *
     * Both bands that showed threads are marquees now. A marquee renders its
     * list twice so the loop has no seam, which would mean every thread link
     * appearing twice, and a link that is sliding across the screen is a poor
     * target however it is marked up. So both are `aria-hidden` and `inert`,
     * and the threads are read rather than clicked.
     *
     * What the page still owes a visitor is a way *in*, and this asserts that
     * it keeps one: every board is a link, and the feed is one press away.
     */
    it('sends a visitor onward to boards and the feed, not to single threads', () => {
        render(
            <Welcome boards={BOARDS} threads={THREADS} trending={TRENDING} />,
        );

        const hrefs = screen
            .getAllByRole('link')
            .map((link) => link.getAttribute('href') ?? '');

        expect(hrefs.filter((href) => /^\/[a-z0-9]+\/\d+$/.test(href))).toEqual(
            [],
        );

        for (const board of BOARDS) {
            expect(hrefs).toContain(`/${board.slug.replaceAll('/', '')}`);
        }

        expect(hrefs).toContain('/popular');
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

    /**
     * The margins number each band "02 / 05" from `HOME_SECTION_IDS`, which is
     * a list written by hand beside a page assembled by hand. Nothing else
     * connects the two, so a band added, removed or renamed leaves the margins
     * counting a page that no longer exists: an id off the list gets no folio
     * at all, and an id on the list with no band inflates every total beneath
     * it. Checked in both directions here because this is the only file that
     * can see the whole page at once.
     */
    it('numbers exactly the bands the page actually stacks', () => {
        const { container } = render(
            <Welcome boards={BOARDS} threads={THREADS} trending={TRENDING} />,
        );

        const onThePage = [...container.querySelectorAll('main section[id]')]
            .map((section) => section.id)
            .filter((id) => id !== '');

        expect(onThePage).toEqual([...HOME_SECTION_IDS]);
    });

    it('draws a margin either side of every band it numbers', () => {
        const { container } = render(
            <Welcome boards={BOARDS} threads={THREADS} trending={TRENDING} />,
        );

        for (const id of HOME_SECTION_IDS) {
            const band = container.querySelector(`main section#${id}`);

            expect(
                band?.querySelectorAll('[data-slot="section-gutter"]'),
            ).toHaveLength(2);
        }
    });
});
