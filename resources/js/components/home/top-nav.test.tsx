import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TopNav } from '@/components/home/top-nav';
import type { User } from '@/types/auth';

/**
 * The real `Link`/`usePage` require an Inertia page context that only exists
 * inside `createInertiaApp`. This mirrors the mock in `app-header.test.tsx`:
 * `Link` renders a plain anchor so the DOM stays queryable by role, and
 * `usePage` reads a mutable fixture reset in `beforeEach`. `useAppearance` is
 * left real, same as `app-header.test.tsx`, so the toggle exercises the
 * actual theme mechanism.
 */
const mockPage: { props: { auth: { user: User | null } }; url: string } = {
    props: { auth: { user: null } },
    url: '/',
};

vi.mock('@inertiajs/react', () => ({
    usePage: () => mockPage,
    Link: ({
        href,
        children,
        ...props
    }: {
        href: string | { url: string };
        children: ReactNode;
    } & Record<string, unknown>) => {
        const url = typeof href === 'string' ? href : href.url;

        return (
            <a href={url} {...props}>
                {children}
            </a>
        );
    },
}));

const SIGNED_IN_USER: User = {
    id: 7,
    name: 'Anonymous',
    email: 'anon@example.com',
    email_verified_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
    mockPage.props = { auth: { user: null } };
    mockPage.url = '/';
    document.documentElement.classList.remove('dark');
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('TopNav', () => {
    it('links the wordmark to home, named "Clover home"', () => {
        render(<TopNav />);

        const wordmarkLink = screen.getByRole('link', {
            name: 'Clover home',
        });

        expect(wordmarkLink).toHaveAttribute('href', '/');
    });

    it('shows Log in and Create account when signed out, and no dashboard link', () => {
        render(<TopNav />);

        expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute(
            'href',
            '/login',
        );
        expect(
            screen.getByRole('link', { name: 'Create account' }),
        ).toHaveAttribute('href', '/register');
        expect(
            screen.queryByRole('link', { name: /dashboard/i }),
        ).not.toBeInTheDocument();
    });

    it('shows a single dashboard link when signed in, hiding the auth actions', () => {
        mockPage.props.auth.user = SIGNED_IN_USER;

        render(<TopNav />);

        expect(
            screen.queryByRole('link', { name: 'Log in' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: 'Create account' }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: /dashboard/i }),
        ).toHaveAttribute('href', '/dashboard');
    });

    it('names the theme toggle by what pressing it does, and flips that name when pressed', async () => {
        const user = userEvent.setup();
        render(<TopNav />);

        const toggle = screen.getByRole('button', {
            name: /switch to (light|dark) theme/i,
        });
        const initialName = toggle.getAttribute('aria-label');

        await user.click(toggle);

        const nextName = toggle.getAttribute('aria-label');
        expect(nextName).toMatch(/switch to (light|dark) theme/i);
        expect(nextName).not.toBe(initialName);
    });

    it('is a sticky bar with a hairline bottom border, not fixed', () => {
        render(<TopNav />);

        const nav = document.querySelector('[data-slot="top-nav"]');

        expect(nav).toHaveClass('sticky', 'top-0', 'border-b');
        expect(nav).not.toHaveClass('fixed');
    });

    it('renders no hamburger or menu control, only the wordmark and the visible actions', () => {
        render(<TopNav />);

        expect(
            screen.queryByRole('button', { name: /menu/i }),
        ).not.toBeInTheDocument();
    });

    /**
     * The header sits over scrolling content, so it needs to read as glass
     * rather than as an opaque bar cutting the page in half.
     *
     * The translucent fill is gated behind `supports-[backdrop-filter]`: where
     * the filter is unavailable the header stays fully opaque, because a
     * see-through header with no blur behind it is unreadable rather than
     * merely unstyled.
     */
    it('frosts the header over the content it covers', () => {
        const { container } = render(<TopNav />);

        const header = container.querySelector('header');

        expect(header?.className).toMatch(/backdrop-blur/);
        expect(header?.className).toMatch(
            /supports-\[backdrop-filter\]:bg-bg\//,
        );
    });

    it('stays opaque where backdrop-filter is unsupported', () => {
        const { container } = render(<TopNav />);

        const header = container.querySelector('header');

        expect(header?.className).toMatch(/(^|\s)bg-bg(\s|$)/);
    });
});
