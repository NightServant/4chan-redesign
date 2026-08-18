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

    /**
     * Task 13, fix 3. Gabe's decision, asked for twice, and it reverses the
     * scoping from earlier in this branch where the homepage was deliberately
     * left alone: the pair is hidden below `md` and unchanged from `md` up.
     *
     * jsdom applies no stylesheet, so `hidden md:flex` renders both links into
     * the document either way and no query can tell whether they are on screen.
     * What is guarded instead is that the pair sits inside one box carrying
     * exactly that pair of classes — and that the box holds *only* the pair, so
     * the wordmark and the theme toggle cannot be hidden with it.
     */
    it('hides Log in and Create account below `md`, and only those two', () => {
        const { container } = render(<TopNav />);

        const group = container.querySelector('[data-slot="top-nav-auth"]');

        expect(group).toHaveClass('hidden', 'md:flex');
        expect(group).toContainElement(
            screen.getByRole('link', { name: 'Log in' }),
        );
        expect(group).toContainElement(
            screen.getByRole('link', { name: 'Create account' }),
        );
        expect(group).not.toContainElement(
            screen.getByRole('link', { name: 'Clover home' }),
        );
        expect(group).not.toContainElement(
            screen.getByRole('button', {
                name: /switch to (light|dark) theme/i,
            }),
        );
    });

    /**
     * The wordmark and the theme toggle are what remain below `md`, and they
     * are not gated behind a breakpoint at any width.
     */
    it('keeps the wordmark and the theme toggle at every width', () => {
        const { container } = render(<TopNav />);

        const row = container.querySelector('[data-slot="top-nav-row"]');
        const wordmarkLink = screen.getByRole('link', { name: 'Clover home' });
        const toggle = screen.getByRole('button', {
            name: /switch to (light|dark) theme/i,
        });

        expect(row).toContainElement(wordmarkLink);
        expect(row).toContainElement(toggle);
        expect(wordmarkLink.className).not.toMatch(/(^|\s)hidden(\s|$)/);
        expect(toggle.className).not.toMatch(/(^|\s)hidden(\s|$)/);
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
     * At a 320px viewport this row needs 71 (wordmark) + 261 (auth buttons) +
     * 48 (theme toggle) = 380px inside a 320px header, and a fixed `h-16`
     * with no wrap sent the auth button group 37px past the edge of the
     * viewport. `flex-wrap` on `min-h-16` lets the row grow to two lines
     * exactly when it does not fit one, which is a no-op at every width wide
     * enough to fit already (the whole desktop and tablet range) and the fix
     * at 320px. jsdom has no layout engine and cannot measure the overflow
     * itself, so this only pins the classes that make wrapping possible.
     */
    it('lets the row wrap instead of forcing a fixed single-line height', () => {
        const { container } = render(<TopNav />);

        const row = container.querySelector('[data-slot="top-nav-row"]');

        expect(row).toHaveClass('flex-wrap', 'min-h-16');
        expect(row).not.toHaveClass('h-16');
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
    /** The paper starts at the top of the page, header included. */
    it('is drawn on the same patterned paper as the bands below it', () => {
        const { container } = render(<TopNav />);

        expect(
            container.querySelector('[data-slot="pattern-field-paper"]')
                ?.className,
        ).toMatch(/bg-dots/);
    });

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
