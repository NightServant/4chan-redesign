import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SettingsLayout from '@/layouts/settings/layout';

describe('SettingsLayout', () => {
    it('supplies the page its single h1', () => {
        render(
            <SettingsLayout>
                <p>Content</p>
            </SettingsLayout>,
        );

        const headings = screen.getAllByRole('heading', { level: 1 });

        expect(headings).toHaveLength(1);
        expect(headings[0]).toHaveTextContent('Settings');
    });

    it('renders the page it wraps', () => {
        render(
            <SettingsLayout>
                <p>Content</p>
            </SettingsLayout>,
        );

        expect(screen.getByText('Content')).toBeInTheDocument();
    });

    /**
     * The section nav went with the second settings page. Profile and Security
     * merged, which left it pointing at one destination — not navigation, but a
     * list with a single item that is always the current one, holding a 224px
     * column of the screen to say so.
     *
     * Asserted as an absence: the page's own panels are named regions, so a
     * screen reader lands on "Password" directly rather than reading a nav
     * first, and nothing about that improves by putting the nav back.
     */
    it('offers no nav to a single destination', () => {
        render(
            <SettingsLayout>
                <p>Content</p>
            </SettingsLayout>,
        );

        expect(
            screen.queryByRole('navigation', { name: 'Settings' }),
        ).not.toBeInTheDocument();
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
});
