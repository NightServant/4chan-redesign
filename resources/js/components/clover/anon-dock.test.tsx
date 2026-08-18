import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnonDock } from '@/components/clover/anon-dock';

const { mockPage } = vi.hoisted(() => ({
    mockPage: { props: { auth: { user: null as { id: number } | null } } },
}));

vi.mock('@inertiajs/react', () => ({
    usePage: () => mockPage,
    Link: ({
        href,
        children,
        ...props
    }: { href: string | { url: string }; children: ReactNode } & Record<
        string,
        unknown
    >) => (
        <a href={typeof href === 'string' ? href : href.url} {...props}>
            {children}
        </a>
    ),
}));

beforeEach(() => {
    mockPage.props.auth.user = null;
});

describe('AnonDock', () => {
    /**
     * What a signed-out anon gets at the foot of a phone, in place of the
     * bottom bar. Gabe's decision, 2026-08-18: a panel that cannot be
     * dismissed, saying what Clover is and offering the two ways in.
     */
    it('says what Clover is and offers both ways in', () => {
        render(<AnonDock />);

        expect(screen.getByText(/anyone can browse/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute(
            'href',
            '/login',
        );
        expect(
            screen.getByRole('link', { name: 'Create account' }),
        ).toHaveAttribute('href', '/register');
    });

    /**
     * Not a `Sheet`. A drawer that cannot be hidden is furniture, and
     * building it from a dismissable primitive would mean defending it
     * against being closed for the rest of its life -- so it is fixed, and
     * carries no control that would close it.
     */
    it('is fixed to the foot of the screen with no way to dismiss it', () => {
        const { container } = render(<AnonDock />);

        const dock = container.querySelector('[data-slot="anon-dock"]');

        expect(dock).toHaveClass('fixed');
        expect(dock).toHaveClass('bottom-0');
        expect(dock).toHaveClass('md:hidden');
        expect(
            screen.queryByRole('button', { name: /close|dismiss/i }),
        ).not.toBeInTheDocument();
    });

    /**
     * An anon with an account needs navigation at the foot of a phone, not an
     * invitation to make one -- `MobileNav` keeps its four slots there, and
     * two fixed bars is one too many.
     */
    it('renders nothing at all for a signed-in anon', () => {
        mockPage.props.auth.user = { id: 7 };

        const { container } = render(<AnonDock />);

        expect(container).toBeEmptyDOMElement();
    });
});
