import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageHeader } from '@/components/clover/page-header';

describe('PageHeader', () => {
    it('renders the title as the page heading', () => {
        render(<PageHeader title="History" />);

        expect(
            screen.getByRole('heading', { level: 1, name: 'History' }),
        ).toBeInTheDocument();
    });

    /**
     * Every screen has exactly one h1. Nothing here may be configurable into
     * an h2: the heading level is the page's outline, not a style choice.
     */
    it('renders the description beneath the heading', () => {
        render(
            <PageHeader
                title="Bookmarks"
                description="Threads you saved. Nothing expires."
            />,
        );

        expect(
            screen.getByText('Threads you saved. Nothing expires.'),
        ).toBeInTheDocument();
    });

    it('omits the description entirely when none is given', () => {
        const { container } = render(<PageHeader title="Messages" />);

        expect(
            container.querySelector('[data-slot="page-header-description"]'),
        ).toBeNull();
    });

    it('renders an action alongside the heading', () => {
        render(
            <PageHeader
                title="History"
                action={<button type="button">Clear all</button>}
            />,
        );

        expect(
            screen.getByRole('button', { name: 'Clear all' }),
        ).toBeInTheDocument();
    });

    /**
     * The description carries machine values (counts, sort order, timestamps),
     * so it uses the tabular-figure treatment rather than plain body text.
     */
    it('sets the description in the machine-value treatment', () => {
        render(<PageHeader title="Communities" description="6 boards" />);

        expect(screen.getByText('6 boards')).toHaveClass('tabular-nums');
    });
});
