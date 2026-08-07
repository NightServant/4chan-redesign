import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import {
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { AppHeader } from '@/components/clover/app-header';
import { ACTIVITY } from '@/fixtures/clover';
import type { User } from '@/types/auth';

/**
 * The real `Link`/`usePage` require an Inertia page context that only exists
 * inside `createInertiaApp`. This mirrors the double `app-sidebar.test.tsx`
 * already uses: `Link` renders a plain anchor (or a button when `as="button"`
 * is given, matching Inertia's own behaviour for non-GET links), and
 * `usePage` reads a mutable fixture reset in `beforeEach`.
 */
const mockPage: {
    props: { auth: { user: User | null }; sidebarOpen: boolean };
    url: string;
} = {
    props: { auth: { user: null }, sidebarOpen: true },
    url: '/',
};

vi.mock('@inertiajs/react', () => ({
    usePage: () => mockPage,
    Link: ({
        href,
        as,
        children,
        ...props
    }: {
        href: string | { url: string };
        as?: string;
        children: ReactNode;
    } & Record<string, unknown>) => {
        const url = typeof href === 'string' ? href : href.url;

        if (as === 'button') {
            return (
                <button type="button" {...props}>
                    {children}
                </button>
            );
        }

        return (
            <a href={url} {...props}>
                {children}
            </a>
        );
    },
}));

/**
 * Radix's menu drives its listbox with pointer capture and scroll APIs that
 * jsdom does not implement. Stub them so the menus can actually open,
 * matching the pattern in select.test.tsx and dropdown-menu.test.tsx.
 */
beforeAll(() => {
    Element.prototype.hasPointerCapture = () => false;
    Element.prototype.setPointerCapture = () => {};
    Element.prototype.releasePointerCapture = () => {};
    Element.prototype.scrollIntoView = () => {};
});

const SIGNED_IN_USER: User = {
    id: 7,
    name: 'Anonymous',
    email: 'anon@example.com',
    email_verified_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
    mockPage.props = { auth: { user: null }, sidebarOpen: true };
    mockPage.url = '/';
    document.documentElement.classList.remove('dark');
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('AppHeader', () => {
    it('shows Log in and Create account and no avatar for a signed-out anon', () => {
        render(<AppHeader />);

        expect(
            screen.getByRole('link', { name: 'Log in' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Create account' }),
        ).toBeInTheDocument();
        expect(
            document.querySelector('[data-slot="anon-avatar"]'),
        ).not.toBeInTheDocument();
    });

    it('sends a signed-out anon to log in rather than a composer when New thread is pressed', () => {
        render(<AppHeader />);

        const newThread = screen.getByRole('link', { name: /new thread/i });
        expect(newThread).toHaveAttribute('href', '/login');
    });

    it('shows the account avatar trigger and opens the account menu on click, with items reachable', async () => {
        const user = userEvent.setup();
        mockPage.props.auth.user = SIGNED_IN_USER;

        render(<AppHeader />);

        expect(
            screen.queryByRole('link', { name: 'Log in' }),
        ).not.toBeInTheDocument();

        const trigger = screen.getByRole('button', {
            name: new RegExp(SIGNED_IN_USER.name, 'i'),
        });
        expect(
            document.querySelector('[data-slot="anon-avatar"]'),
        ).toBeInTheDocument();

        await user.click(trigger);

        expect(
            await screen.findByRole('menuitem', { name: /your profile/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('menuitem', { name: /bookmarks/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('menuitem', { name: /history/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('menuitem', { name: /settings/i }),
        ).toBeInTheDocument();

        const signOut = screen.getByRole('menuitem', { name: /sign out/i });
        expect(signOut.tagName).toBe('BUTTON');
    });

    it('calls onCompose for a signed-in anon pressing New thread, instead of navigating', async () => {
        const user = userEvent.setup();
        const onCompose = vi.fn();
        mockPage.props.auth.user = SIGNED_IN_USER;

        render(<AppHeader onCompose={onCompose} />);

        const newThread = screen.getByRole('button', { name: /new thread/i });
        await user.click(newThread);

        expect(onCompose).toHaveBeenCalledTimes(1);
    });

    it('names the notifications button with the unread count, not colour alone', () => {
        mockPage.props.auth.user = SIGNED_IN_USER;

        render(<AppHeader />);

        expect(
            screen.getByRole('button', { name: 'Notifications, 3 unread' }),
        ).toBeInTheDocument();
    });

    it('opens the notifications menu on click, listing the first three activity entries and a link to see all', async () => {
        const user = userEvent.setup();
        mockPage.props.auth.user = SIGNED_IN_USER;

        render(<AppHeader />);

        await user.click(
            screen.getByRole('button', { name: 'Notifications, 3 unread' }),
        );

        for (const entry of ACTIVITY.slice(0, 3)) {
            expect(await screen.findByText(entry.text)).toBeInTheDocument();
        }

        expect(screen.queryByText(ACTIVITY[3].text)).not.toBeInTheDocument();

        const seeAll = screen.getByRole('menuitem', {
            name: /see all notifications/i,
        });
        expect(seeAll).toHaveAttribute('href', '/notifications');
    });

    it('hides notifications and messages for a signed-out anon, who has nothing to show there', () => {
        render(<AppHeader />);

        expect(
            screen.queryByRole('button', { name: /notifications/i }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: /^messages$/i }),
        ).not.toBeInTheDocument();
    });

    it('names the theme toggle by what pressing it does, and flips that name when pressed', async () => {
        const user = userEvent.setup();
        render(<AppHeader />);

        const toggle = screen.getByRole('button', {
            name: /switch to (light|dark) theme/i,
        });
        const initialName = toggle.getAttribute('aria-label');

        await user.click(toggle);

        const nextName = toggle.getAttribute('aria-label');
        expect(nextName).toMatch(/switch to (light|dark) theme/i);
        expect(nextName).not.toBe(initialName);
    });

    it('renders the search field capped at 520px, not full bleed', () => {
        render(<AppHeader />);

        const search = screen.getByRole('button', {
            name: /search boards and threads/i,
        });
        const wrapper = search.parentElement;

        expect(wrapper).toHaveClass('max-w-[520px]');
    });

    it('is a sticky bar sitting above content, not fixed', () => {
        render(<AppHeader />);

        const header = document.querySelector('[data-slot="app-header"]');

        expect(header).toHaveClass('sticky', 'top-0');
        expect(header).not.toHaveClass('fixed');
    });
});
