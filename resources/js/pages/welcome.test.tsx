import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { THREADS } from '@/fixtures/clover';
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

describe('Welcome', () => {
    it('has exactly one first-level heading', () => {
        render(<Welcome />);

        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    });

    /**
     * A document that jumps h1 to h3 leaves a screen-reader user unable to
     * tell whether they missed a section.
     */
    it('steps heading levels without skipping one', () => {
        render(<Welcome />);

        const levels = screen
            .getAllByRole('heading')
            .map((heading) => Number(heading.tagName.slice(1)));

        expect(levels[0]).toBe(1);

        for (let i = 1; i < levels.length; i++) {
            expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
        }
    });

    it('lays out the page as banner, main and contentinfo landmarks', () => {
        render(<Welcome />);

        expect(screen.getByRole('banner')).toBeInTheDocument();
        expect(screen.getByRole('main')).toBeInTheDocument();
        expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });

    /**
     * This is the one page a first-time visitor sees. A link that goes nowhere
     * here is worse than a missing feature: it reads as a broken product.
     */
    it('points every link at a real path', () => {
        render(<Welcome />);

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
     * Thread routes do not exist yet, so any card shown here must be pointed
     * at a page that does. Guards the whole page rather than each band.
     */
    it('never links into a thread route that has not been built', () => {
        render(<Welcome />);

        for (const link of screen.getAllByRole('link')) {
            expect(link.getAttribute('href')).not.toMatch(/^\/[a-z]+\/\d+$/);
        }
    });

    /**
     * The no-em-dash rule governs copy Clover writes, not content it is
     * pretending an anon typed. `THREADS[1].title` carries one and is correct
     * to: thread titles are user text, and real people use em dashes. So the
     * fixture strings are removed before asserting, which keeps the guard on
     * the marketing copy where the rule actually applies.
     */
    it('contains no em dashes in copy Clover wrote', () => {
        const { container } = render(<Welcome />);

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
