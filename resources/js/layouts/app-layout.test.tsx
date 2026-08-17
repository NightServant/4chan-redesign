import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AppLayout from '@/layouts/app-layout';
import { PRIMARY_NAV } from '@/lib/navigation';
import type { User } from '@/types/auth';
import type { Board, ThreadNotification } from '@/types/clover';

/**
 * The real `Link`/`usePage`/`router` require an Inertia page context that
 * only exists inside `createInertiaApp`. This mirrors the double
 * `app-sidebar.test.tsx` and `app-header.test.tsx` already use: `Link`
 * renders a plain anchor, `usePage` reads a mutable fixture reset in
 * `beforeEach`, and `router.on` is captured so a test can fire a fake
 * navigation without a real Inertia visit.
 */
const { navigateCallbacks } = vi.hoisted(() => ({
    navigateCallbacks: [] as Array<() => void>,
}));

const mockPage: {
    props: {
        auth: { user: User | null };
        sidebarOpen: boolean;
        sidebarBoards: Board[];
        sidebarTrending: Board[];
        threadNotifications: ThreadNotification[];
    };
    url: string;
} = {
    props: {
        auth: { user: null },
        sidebarOpen: true,
        sidebarBoards: [],
        sidebarTrending: [],
        threadNotifications: [],
    },
    url: '/',
};

vi.mock('@inertiajs/react', () => ({
    usePage: () => mockPage,
    router: {
        on: (event: string, callback: () => void) => {
            if (event === 'navigate') {
                navigateCallbacks.push(callback);
            }

            return () => {};
        },
        patch: vi.fn(),
    },
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

const PUBLIC_ITEM = PRIMARY_NAV.find((item) => !item.requiresAuth);

if (!PUBLIC_ITEM) {
    throw new Error('PRIMARY_NAV has no item usable by a signed-out anon.');
}

beforeEach(() => {
    mockPage.props = {
        auth: { user: null },
        sidebarOpen: true,
        sidebarBoards: [],
        sidebarTrending: [],
        threadNotifications: [],
    };
    mockPage.url = '/';
    navigateCallbacks.length = 0;
});

describe('AppLayout', () => {
    it('does not render the sidebar drawer open by default', () => {
        render(<AppLayout>content</AppLayout>);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('opens the sidebar drawer from the header hamburger, moving focus inside it and showing the sidebar rows', async () => {
        const user = userEvent.setup();
        render(<AppLayout>content</AppLayout>);

        await user.click(screen.getByRole('button', { name: /open sidebar/i }));

        const dialog = screen.getByRole('dialog');
        expect(dialog.contains(document.activeElement)).toBe(true);
        expect(
            within(dialog).getByRole('link', { name: PUBLIC_ITEM.title }),
        ).toBeInTheDocument();
    });

    it('closes on Escape and returns focus to the hamburger', async () => {
        const user = userEvent.setup();
        render(<AppLayout>content</AppLayout>);

        const trigger = screen.getByRole('button', {
            name: /open sidebar/i,
        });
        await user.click(trigger);
        expect(screen.getByRole('dialog')).toBeInTheDocument();

        await user.keyboard('{Escape}');

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(document.activeElement).toBe(trigger);
    });

    /**
     * The page behind the drawer is supposed to be inert while it is open,
     * so a direct click on it is not how "click outside" works here — Radix
     * marks the rest of the document `pointer-events: none` for exactly that
     * reason, and a real click could not reach it either. The overlay is the
     * click target that dismisses the dialog; asserting through it is also
     * indirect confirmation that the inertness itself is in place.
     */
    it('closes when the overlay behind it is clicked', async () => {
        const user = userEvent.setup();
        render(<AppLayout>page content</AppLayout>);

        await user.click(screen.getByRole('button', { name: /open sidebar/i }));
        expect(screen.getByRole('dialog')).toBeInTheDocument();

        const overlay = document.querySelector('[data-slot="sheet-overlay"]');
        expect(overlay).not.toBeNull();
        await user.click(overlay as Element);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    /**
     * Navigating away fires neither Escape nor an outside click, so without
     * this the drawer would stay open over whatever page Inertia just
     * swapped in. `AppLayout` is a persistent layout that does not remount
     * between visits, which is exactly why this has to be explicit.
     *
     * `AppHeader` registered a second `navigate` listener of its own for a
     * while, to collapse a mobile search button that no longer exists — the
     * field below `md` is a real one at rest now, with nothing to collapse.
     * One listener is expected here again, but this fires every callback
     * captured rather than assuming a specific count, since what this test
     * cares about is that the drawer's own listener is among them.
     */
    it('closes when an Inertia navigation completes', async () => {
        const user = userEvent.setup();
        render(<AppLayout>content</AppLayout>);

        await user.click(screen.getByRole('button', { name: /open sidebar/i }));
        expect(screen.getByRole('dialog')).toBeInTheDocument();

        expect(navigateCallbacks.length).toBeGreaterThan(0);
        act(() => {
            for (const callback of navigateCallbacks) {
                callback();
            }
        });

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});
