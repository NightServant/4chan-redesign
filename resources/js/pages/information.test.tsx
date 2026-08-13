import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { INFORMATION } from '@/content/information';
import Information from '@/pages/information';

vi.mock('@inertiajs/react', () => ({
    Head: ({ title }: { title: string }) => <title>{title}</title>,
    Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a>,
}));

const WRITTEN = Object.keys(INFORMATION);

describe('Information', () => {
    it.each(WRITTEN)(
        'renders %s as a real page, not a placeholder',
        (title) => {
            render(<Information title={title} />);

            expect(
                screen.getByRole('heading', { level: 1, name: title }),
            ).toBeInTheDocument();
            expect(
                screen.queryByText(/has not been written yet/),
            ).not.toBeInTheDocument();
        },
    );

    it.each(WRITTEN)('renders every section of %s', (title) => {
        render(<Information title={title} />);

        const page = INFORMATION[title];

        expect(screen.getByText(page.summary)).toBeInTheDocument();

        for (const section of page.sections) {
            expect(
                screen.getByRole('heading', {
                    level: 2,
                    name: section.heading,
                }),
            ).toBeInTheDocument();

            for (const paragraph of section.body) {
                expect(screen.getByText(paragraph)).toBeInTheDocument();
            }
        }
    });

    /**
     * `search` is a real destination whose feature has not been built. It
     * keeps the placeholder rather than being given invented copy, and the
     * fallback has to survive a title that has no entry at all.
     */
    it('keeps the honest placeholder for a page with no copy yet', () => {
        render(<Information title="Search" />);

        expect(
            screen.getByText(/This page has not been written yet/),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Search' }),
        ).toBeInTheDocument();
    });

    /**
     * The pages make checkable claims about how this application behaves. If
     * one stops being true the page is wrong, so the load-bearing ones are
     * pinned here where a change to them has to be deliberate.
     */
    it('states that nothing is ever written upstream', () => {
        render(<Information title="FAQ" />);

        expect(
            screen.getByText(/accepts GET, HEAD and OPTIONS only/),
        ).toBeInTheDocument();
    });

    it('states that Clover stores identifiers rather than files', () => {
        render(<Information title="Terms" />);

        expect(
            screen.getByText(/holds the identifier of a file, not the file/),
        ).toBeInTheDocument();
    });

    it('states that a post carries no reference to the account behind it', () => {
        render(<Information title="Privacy" />);

        expect(
            screen.getByText(
                /no post carries a reference back to the account that wrote it/,
            ),
        ).toBeInTheDocument();
    });

    it('renders no cards, matching the rest of the site', () => {
        const { container } = render(<Information title="Rules" />);

        expect(container.querySelector('[data-slot="card"]')).toBeNull();
    });
});
