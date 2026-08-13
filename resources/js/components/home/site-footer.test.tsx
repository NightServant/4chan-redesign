import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SiteFooter } from '@/components/home/site-footer';

/** Label to route, and the whole map: nothing else may appear down there. */
const DESTINATIONS: Record<string, string> = {
    Boards: '/communities',
    Rules: '/rules',
    FAQ: '/faq',
    Terms: '/terms',
    Privacy: '/privacy',
};

/**
 * The six that were removed rather than written. Each described something
 * Clover does not have: there is no janitor queue, no report flow, no
 * contribution process, no status page, no DMCA process for files it never
 * stores, and no contact address.
 */
const REMOVED = [
    'Search',
    'Janitor queue',
    'Status',
    'Report a post',
    'Contribute',
    'DMCA',
    'Contact',
];

describe('SiteFooter', () => {
    it('renders as a footer landmark, not a Section', () => {
        const { container } = render(<SiteFooter />);

        expect(screen.getByRole('contentinfo')).toBeInTheDocument();
        expect(container.querySelector('section')).not.toBeInTheDocument();
    });

    it('renders the wordmark', () => {
        render(<SiteFooter />);

        expect(screen.getByText('clover')).toBeInTheDocument();
    });

    /**
     * It read "Anonymous discussion, since 2024." with the year written in,
     * which was wrong the moment 2025 arrived and would have been wrong again
     * every January after that. A hardcoded year is a bug with a scheduled
     * start date, so the year is read at render.
     */
    it('states the copyright with a real symbol and the current year', () => {
        render(<SiteFooter />);

        const year = String(new Date().getFullYear());
        const notice = screen.getByText(new RegExp(`©\\s*${year}`));

        expect(notice).toBeInTheDocument();
        expect(notice).toHaveClass('tabular-nums');
        expect(notice.textContent).not.toMatch(/\b2024\b/);
    });

    it('renders the two link group headings', () => {
        render(<SiteFooter />);

        expect(screen.getByText('Product')).toBeInTheDocument();
        expect(screen.getByText('Legal')).toBeInTheDocument();
        expect(screen.queryByText('Community')).not.toBeInTheDocument();
    });

    it('points each entry at the route its label names', () => {
        render(<SiteFooter />);

        for (const [label, href] of Object.entries(DESTINATIONS)) {
            expect(screen.getByRole('link', { name: label })).toHaveAttribute(
                'href',
                href,
            );
        }
    });

    /**
     * A footer is a map of the product. Advertising a janitor queue and a DMCA
     * process on a read-only mirror that has neither misdescribes the site,
     * and being upfront that the page is empty does not fix that.
     */
    it('advertises nothing the site does not have', () => {
        render(<SiteFooter />);

        for (const label of REMOVED) {
            expect(
                screen.queryByRole('link', { name: label }),
            ).not.toBeInTheDocument();
        }
    });

    it('renders every destination as a real link and nothing more', () => {
        render(<SiteFooter />);

        const links = screen.getAllByRole('link');

        expect(links).toHaveLength(Object.keys(DESTINATIONS).length);

        for (const link of links) {
            expect(link.getAttribute('href')).toMatch(/^\//);
        }
    });

    it('groups the entries under their own headings', () => {
        render(<SiteFooter />);

        const legal = screen.getByRole('navigation', { name: 'Legal' });

        expect(
            within(legal).getByRole('link', { name: 'Terms' }),
        ).toBeInTheDocument();
        expect(
            within(legal).queryByRole('link', { name: 'Boards' }),
        ).not.toBeInTheDocument();
    });

    /** The paper runs unbroken to the bottom of the page, footer included. */
    it('is drawn on the same patterned paper as the bands above it', () => {
        const { container } = render(<SiteFooter />);

        expect(
            container.querySelector('[data-slot="pattern-field-paper"]')
                ?.className,
        ).toMatch(/bg-dots/);
        expect(container.querySelector('.mx-auto')?.className).toMatch(
            /border-x/,
        );
    });

    it('contains no em dashes anywhere in its rendered text', () => {
        const { container } = render(<SiteFooter />);

        expect(container.textContent).not.toMatch(/—|--/);
    });
});
