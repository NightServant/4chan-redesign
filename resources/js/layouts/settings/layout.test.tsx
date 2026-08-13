import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsLayout from '@/layouts/settings/layout';

/**
 * `usePage` and `Link` need a real Inertia app context this test does not
 * have. `Link` renders a plain anchor so the nav stays queryable by role, and
 * `usePage` reads a mutable url so the active row can be driven per test.
 */
const { usePage } = vi.hoisted(() => ({ usePage: vi.fn() }));

vi.mock('@inertiajs/react', () => ({
    usePage,
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

function mockUrl(url: string): void {
    usePage.mockReturnValue({ url, props: {} });
}

beforeEach(() => {
    mockUrl('/settings/profile');
});

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

    it('renders the two settings destinations in a labelled nav', () => {
        render(
            <SettingsLayout>
                <p>Content</p>
            </SettingsLayout>,
        );

        const nav = screen.getByRole('navigation', { name: 'Settings' });
        const links = within(nav).getAllByRole('link');

        expect(links.map((link) => link.textContent)).toEqual([
            'Profile',
            'Security',
        ]);
        expect(links.map((link) => link.getAttribute('href'))).toEqual([
            '/settings/profile',
            '/settings/security',
                    ]);
    });

    it('marks only the current destination with aria-current', () => {
        render(
            <SettingsLayout>
                <p>Content</p>
            </SettingsLayout>,
        );

        const nav = screen.getByRole('navigation', { name: 'Settings' });

        expect(
            within(nav).getByRole('link', { name: 'Profile' }),
        ).toHaveAttribute('aria-current', 'page');
        expect(
            within(nav).getByRole('link', { name: 'Security' }),
        ).not.toHaveAttribute('aria-current');
    });

    it('moves the active state when the url changes', () => {
        mockUrl('/settings/security');

        render(
            <SettingsLayout>
                <p>Content</p>
            </SettingsLayout>,
        );

        const nav = screen.getByRole('navigation', { name: 'Settings' });

        expect(
            within(nav).getByRole('link', { name: 'Security' }),
        ).toHaveAttribute('aria-current', 'page');
        expect(
            within(nav).getByRole('link', { name: 'Profile' }),
        ).not.toHaveAttribute('aria-current');
    });

    it('renders the page it wraps', () => {
        render(
            <SettingsLayout>
                <p>Content</p>
            </SettingsLayout>,
        );

        expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('names each destination with an icon that is hidden from assistive tech', () => {
        const { container } = render(
            <SettingsLayout>
                <p>Content</p>
            </SettingsLayout>,
        );

        const nav = screen.getByRole('navigation', { name: 'Settings' });

        expect(container.querySelectorAll('nav svg')).toHaveLength(2);
        expect(
            within(nav)
                .getAllByRole('link')
                .every(
                    (link) =>
                        link
                            .querySelector('svg')
                            ?.getAttribute('aria-hidden') === 'true',
                ),
        ).toBe(true);
    });
});
