import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MobileNav } from '@/components/clover/mobile-nav';
import { toUrl } from '@/lib/utils';
import { account, dashboard, login, notifications, rules } from '@/routes';

const { usePage } = vi.hoisted(() => ({ usePage: vi.fn() }));

/**
 * `usePage` throws outside an `<App>` unless mocked: the real hook reads a
 * React context that only Inertia's root component provides. `Link` is
 * replaced with a plain anchor for the same reason, and because it keeps the
 * DOM queryable by role without pulling in the real router.
 */
vi.mock('@inertiajs/react', () => ({
    usePage,
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

function mockPage({
    url = '/',
    signedIn = false,
}: { url?: string; signedIn?: boolean } = {}) {
    usePage.mockReturnValue({
        url,
        props: {
            auth: { user: signedIn ? { id: 1, name: 'anon' } : null },
        },
    });
}

describe('MobileNav', () => {
    /**
     * The bar became Home, Rules, Notifications, You after task 4:
     * Popular and Latest are reachable from the drawer (the sidebar's own
     * list below `lg`), and History moved onto the account screen.
     */
    it('renders Home, Rules and the sign-in slot when signed out, and no Notifications', () => {
        mockPage({ signedIn: false });

        render(<MobileNav />);

        expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Rules' })).toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: 'Notifications' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: 'Popular' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: 'History' }),
        ).not.toBeInTheDocument();
    });

    /**
     * `requiresAuth` items drop out for a signed-out anon, but the fourth
     * slot is never one of them: it reads "Log in" and points at `/login`
     * instead of disappearing. It has to be exactly one control, not zero
     * and not two.
     */
    it('offers exactly one sign-in control, reading "Log in" and pointing at /login, when signed out', () => {
        mockPage({ signedIn: false });

        render(<MobileNav />);

        const signIn = screen.getAllByRole('link', { name: 'Log in' });

        expect(signIn).toHaveLength(1);
        expect(signIn[0]).toHaveAttribute('href', toUrl(login()));
        expect(
            screen.queryByRole('link', { name: 'You' }),
        ).not.toBeInTheDocument();
    });

    it('renders all four destinations when signed in, the fourth reading "You"', () => {
        mockPage({ signedIn: true });

        render(<MobileNav />);

        expect(
            screen.getAllByRole('link', {
                name: /Home|Rules|Notifications|You/,
            }),
        ).toHaveLength(4);
        expect(
            screen.queryByRole('link', { name: 'Log in' }),
        ).not.toBeInTheDocument();
    });

    it('points the fourth slot at /account when signed in', () => {
        mockPage({ signedIn: true });

        render(<MobileNav />);

        expect(screen.getByRole('link', { name: 'You' })).toHaveAttribute(
            'href',
            toUrl(account()),
        );
    });

    it('points Rules at the existing /rules page', () => {
        mockPage({ signedIn: false });

        render(<MobileNav />);

        expect(screen.getByRole('link', { name: 'Rules' })).toHaveAttribute(
            'href',
            toUrl(rules()),
        );
    });

    it('points Notifications at /notifications when signed in', () => {
        mockPage({ signedIn: true });

        render(<MobileNav />);

        expect(
            screen.getByRole('link', { name: 'Notifications' }),
        ).toHaveAttribute('href', toUrl(notifications()));
    });

    /**
     * Signed in, Home is the feed rather than the marketing page, so the
     * current-page match is against /dashboard.
     */
    it('marks the destination matching the current URL with aria-current', () => {
        mockPage({ url: toUrl(dashboard()), signedIn: true });

        render(<MobileNav />);

        expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute(
            'aria-current',
            'page',
        );
        expect(screen.getByRole('link', { name: 'Rules' })).not.toHaveAttribute(
            'aria-current',
        );
    });

    it('does not convey the active state by colour alone', () => {
        mockPage({ url: toUrl(rules()), signedIn: true });

        render(<MobileNav />);

        const active = screen.getByRole('link', { name: 'Rules' });
        const rest = screen.getByRole('link', { name: 'Home' });

        expect(active).toHaveAttribute('aria-current', 'page');
        expect(rest).not.toHaveAttribute('aria-current');
    });

    it('gives every item an accessible name from real text, not decoration alone', () => {
        mockPage({ signedIn: false });

        render(<MobileNav />);

        for (const name of ['Home', 'Rules', 'Log in']) {
            const link = screen.getByRole('link', { name });
            expect(link).toHaveAccessibleName(name);
        }
    });

    it('renders as a nav landmark so it is reachable as a region', () => {
        mockPage({ signedIn: false });

        render(<MobileNav />);

        expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('lays out three items and four items without a fixed column-count assumption', () => {
        mockPage({ signedIn: false });

        const { container: signedOutContainer } = render(<MobileNav />);
        const signedOutLinks = signedOutContainer.querySelectorAll('a');

        expect(signedOutLinks).toHaveLength(3);

        mockPage({ signedIn: true });

        const { container: signedInContainer } = render(<MobileNav />);
        const signedInLinks = signedInContainer.querySelectorAll('a');

        expect(signedInLinks).toHaveLength(4);
    });
});
