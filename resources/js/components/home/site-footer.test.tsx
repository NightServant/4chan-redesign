import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SiteFooter } from '@/components/home/site-footer';

describe('SiteFooter', () => {
    it('renders as a footer landmark, not a Section', () => {
        const { container } = render(<SiteFooter />);

        expect(screen.getByRole('contentinfo')).toBeInTheDocument();
        expect(container.querySelector('section')).not.toBeInTheDocument();
    });

    it('renders the wordmark and the tagline through MachineValue', () => {
        render(<SiteFooter />);

        expect(screen.getByText('clover')).toBeInTheDocument();

        const tagline = screen.getByText('Anonymous discussion, since 2024.');
        expect(tagline).toBeInTheDocument();
        expect(tagline).toHaveClass('tabular-nums');
    });

    it('renders the three link group headings', () => {
        render(<SiteFooter />);

        expect(screen.getByText('Product')).toBeInTheDocument();
        expect(screen.getByText('Community')).toBeInTheDocument();
        expect(screen.getByText('Legal')).toBeInTheDocument();
    });

    it('lists the Product group entries', () => {
        render(<SiteFooter />);

        const group = screen.getByRole('navigation', { name: 'Product' });
        ['Boards', 'Search', 'Janitor queue', 'Status'].forEach((entry) => {
            expect(within(group).getByText(entry)).toBeInTheDocument();
        });
    });

    it('lists the Community group entries', () => {
        render(<SiteFooter />);

        const group = screen.getByRole('navigation', { name: 'Community' });
        ['Rules', 'FAQ', 'Report a post', 'Contribute'].forEach((entry) => {
            expect(within(group).getByText(entry)).toBeInTheDocument();
        });
    });

    it('lists the Legal group entries', () => {
        render(<SiteFooter />);

        const group = screen.getByRole('navigation', { name: 'Legal' });
        ['Terms', 'Privacy', 'DMCA', 'Contact'].forEach((entry) => {
            expect(within(group).getByText(entry)).toBeInTheDocument();
        });
    });

    /**
     * Every destination resolves to a real page. Most of those pages say only
     * that they have not been written yet, which is the honest state of
     * things. The rejected alternatives were href="#" (dresses an inert entry
     * as a working link) and a disabled button (wrong semantic for a
     * destination, and dropped from the tab order, which erases the footer's
     * structure for keyboard and screen-reader users).
     */
    it('renders every destination as a real link to a real route', () => {
        render(<SiteFooter />);

        const links = screen.getAllByRole('link');

        expect(links).toHaveLength(12);

        for (const link of links) {
            const href = link.getAttribute('href');

            expect(href).toBeTruthy();
            expect(href).not.toBe('#');
            expect(href?.startsWith('/')).toBe(true);
        }
    });

    it('points each entry at the route its label names', () => {
        render(<SiteFooter />);

        const expected: Record<string, string> = {
            Rules: '/rules',
            FAQ: '/faq',
            Terms: '/terms',
            Privacy: '/privacy',
            DMCA: '/dmca',
            Contact: '/contact',
            Status: '/status',
            Search: '/search',
            Contribute: '/contribute',
        };

        for (const [label, href] of Object.entries(expected)) {
            expect(screen.getByRole('link', { name: label })).toHaveAttribute(
                'href',
                href,
            );
        }
    });

    it('contains no em dashes anywhere in its rendered text', () => {
        const { container } = render(<SiteFooter />);

        expect(container.textContent).not.toMatch(/—|--/);
    });
});
