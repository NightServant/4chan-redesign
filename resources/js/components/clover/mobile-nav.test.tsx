import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MobileNav } from '@/components/clover/mobile-nav';
import { toUrl } from '@/lib/utils';
import { account, dashboard, notifications, rules } from '@/routes';

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
     * The bar became Home, Rules, Alerts, You after task 4 (task 4 called
     * the third slot "Notifications"; task 5 renamed it "Alerts" — the bar's
     * own label only, same route, same sidebar entry).
     * Popular and Latest are reachable from the drawer (the sidebar's own
     * list below `lg`), and History moved onto the account screen.
     */
    /**
     * Nothing at all when signed out.
     *
     * The bar's three signed-out slots were Home, Rules and Log in: the first
     * two are in the drawer, and the third is one of `AnonDock`'s two
     * buttons. Two fixed bars at the foot of a phone is one too many, and the
     * one that says what Clover is wins. Gabe's decision, 2026-08-18.
     */
    it('does not render at all for a signed-out anon', () => {
        mockPage({ signedIn: false });

        const { container } = render(<MobileNav />);

        expect(container).toBeEmptyDOMElement();
    });

    /* Popular and Latest lost their slots to the drawer in task 4; the bar
       carries the four an anon reaches for, and nothing else. */
    it('renders Home, Rules, Alerts and You for a signed-in anon', () => {
        mockPage({ signedIn: true });

        render(<MobileNav />);

        expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Rules' })).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Alerts' }),
        ).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'You' })).toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: 'Popular' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: 'History' }),
        ).not.toBeInTheDocument();
    });

    /* The sign-in control moved to `AnonDock`, which is the only thing at the
       foot of a phone for a signed-out anon now. Its own suite owns that
       assertion; this bar does not render for them at all. */

    it('renders all four destinations when signed in, the fourth reading "You"', () => {
        mockPage({ signedIn: true });

        render(<MobileNav />);

        expect(
            screen.getAllByRole('link', {
                name: /Home|Rules|Alerts|You/,
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
        mockPage({ signedIn: true });

        render(<MobileNav />);

        expect(screen.getByRole('link', { name: 'Rules' })).toHaveAttribute(
            'href',
            toUrl(rules()),
        );
    });

    /** The bar's label is "Alerts"; the route underneath it is still /notifications. */
    it('points Alerts at /notifications when signed in', () => {
        mockPage({ signedIn: true });

        render(<MobileNav />);

        expect(screen.getByRole('link', { name: 'Alerts' })).toHaveAttribute(
            'href',
            toUrl(notifications()),
        );
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
        mockPage({ signedIn: true });

        render(<MobileNav />);

        for (const name of ['Home', 'Rules', 'Alerts', 'You']) {
            const link = screen.getByRole('link', { name });
            expect(link).toHaveAccessibleName(name);
        }
    });

    it('renders as a nav landmark so it is reachable as a region', () => {
        mockPage({ signedIn: true });

        render(<MobileNav />);

        expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    /**
     * The bar distributes with `flex-1` rather than a fixed column count.
     *
     * It used to render three slots signed out and four signed in, which is
     * what that rule was for; signed out it renders nothing at all now, so
     * the case that remains is the four-slot one -- and the layout rule is
     * asserted directly, because a count of four proves nothing about how
     * the fifth would sit if one were ever added.
     */
    it('distributes its slots rather than assuming a column count', () => {
        mockPage({ signedIn: true });

        const { container } = render(<MobileNav />);
        const links = container.querySelectorAll('a');

        expect(links).toHaveLength(4);

        for (const link of links) {
            expect(link.className).toMatch(/(^|\s)flex-1(\s|$)/);
        }
    });

    /**
     * Task 5's 44px touch target does not touch this bar: `min-h-12` is
     * 48px, already over the minimum, and each slot's own width (`flex-1`
     * of a signed-in 320px bar, the narrowest case) is 80px, also over it.
     * `touch-target-44` grows a control up to 44px in an axis that falls
     * short of it and leaves an axis alone that already clears it, so
     * applying it here would be a no-op in both axes -- there is nothing
     * for it to do. This guards the arithmetic staying true rather than
     * the class being present, since no class was added.
     */
    it('already clears the 44px touch minimum in both axes, so nothing here changed for task 5', () => {
        mockPage({ signedIn: true });

        render(<MobileNav />);

        const link = screen.getByRole('link', { name: 'Home' });

        expect(link).toHaveClass('min-h-12');
        expect(link).toHaveClass('flex-1');
        expect(link).not.toHaveClass('touch-target-44');
    });
});
