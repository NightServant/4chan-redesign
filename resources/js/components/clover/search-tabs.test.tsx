import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SearchTabs } from '@/components/clover/search-tabs';

/**
 * The `Link` double carries `href` through, because a tab that navigates
 * nowhere is precisely the defect these tests exist to catch: this codebase
 * has already shipped one double that swallowed `href` and let a broken
 * destination pass forty-five tests.
 */
vi.mock('@inertiajs/react', () => ({
    Link: ({
        href,
        children,
        ...props
    }: { href: string; children: ReactNode } & Record<string, unknown>) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

function renderTabs(overrides: Partial<Parameters<typeof SearchTabs>[0]> = {}) {
    render(
        <SearchTabs
            query="risc"
            type="all"
            sort="relevant"
            time="all"
            {...overrides}
        />,
    );
}

describe('SearchTabs', () => {
    it('offers the four tabs, in Reddit’s order', () => {
        renderTabs();

        const tabs = screen
            .getAllByRole('link')
            .map((link) => link.textContent?.trim());

        expect(tabs).toEqual(['All', 'Posts', 'Communities', 'Comments']);
    });

    /** Shareable and reload-proof: the tab is a URL, not component state. */
    it('links each tab to its own URL, keeping the query', () => {
        renderTabs();

        expect(screen.getByRole('link', { name: 'All' })).toHaveAttribute(
            'href',
            '/search?q=risc',
        );
        expect(screen.getByRole('link', { name: 'Comments' })).toHaveAttribute(
            'href',
            '/search?q=risc&type=comments',
        );
    });

    it('keeps the sort and the time when the tab changes', () => {
        renderTabs({ type: 'posts', sort: 'latest', time: 'week' });

        expect(screen.getByRole('link', { name: 'Comments' })).toHaveAttribute(
            'href',
            '/search?q=risc&type=comments&sort=latest&time=week',
        );
    });

    /**
     * Switching to a tab that cannot answer the current sort must not carry
     * it along: the server would normalise it away and the page would come
     * back marking an option nothing was ordered by.
     */
    it('drops a sort the destination tab cannot apply', () => {
        renderTabs({ type: 'posts', sort: 'replies' });

        expect(
            screen.getByRole('link', { name: 'Communities' }),
        ).toHaveAttribute('href', '/search?q=risc&type=communities');
    });

    it('marks the current tab for assistive tech, not by colour alone', () => {
        renderTabs({ type: 'comments' });

        expect(screen.getByRole('link', { name: 'Comments' })).toHaveAttribute(
            'aria-current',
            'page',
        );
        expect(screen.getByRole('link', { name: 'All' })).not.toHaveAttribute(
            'aria-current',
        );

        /* The active mark is an underline, which survives greyscale. */
        expect(
            screen.getByRole('link', { name: 'Comments' }).className,
        ).toContain('border-primary');
    });

    it('names the row for a screen reader', () => {
        renderTabs();

        expect(
            screen.getByRole('navigation', { name: /search results/i }),
        ).toBeInTheDocument();
    });

    /** Four tabs do not fit a 320px phone; the row scrolls rather than wraps. */
    it('scrolls sideways rather than wrapping onto a second line', () => {
        renderTabs();

        const row = screen.getByRole('navigation', { name: /search results/i });

        expect(row.className).toContain('overflow-x-auto');
        expect(row.className).not.toContain('flex-wrap');
    });
});
