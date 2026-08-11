import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { BOARD_DIRECTORY } from '@/fixtures/clover';
import Communities from '@/pages/communities';

vi.mock('@inertiajs/react', () => ({
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

describe('Communities page', () => {
    it('renders the directory under a single page heading', () => {
        render(<Communities />);

        expect(
            screen.getByRole('heading', { level: 1, name: 'Communities' }),
        ).toBeInTheDocument();
        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    });

    it('links only slugs the router accepts', () => {
        render(<Communities />);

        const routable = ['/g', '/wg', '/biz', '/x', '/fit', '/co'];
        const hrefs = screen
            .getAllByRole('link')
            .map((link) => link.getAttribute('href'));

        expect(hrefs).toHaveLength(BOARD_DIRECTORY.length);
        expect(hrefs.every((href) => routable.includes(href ?? ''))).toBe(true);
    });
});
