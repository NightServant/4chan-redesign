import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuthLayout from '@/layouts/auth-layout';

/* `AuthCard` reads the shared auth prop to decide whether its wordmark is a
   way out to the marketing homepage -- signed in, it must not be. Real
   Inertia always provides `usePage`; a double that omits it only proves the
   component cannot be rendered. */
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

beforeEach(() => {
    usePage.mockReturnValue({ props: { auth: { user: null } } });
});

describe('AuthLayout', () => {
    it('passes the layout props straight through to the split template', () => {
        render(
            <AuthLayout
                title="Reset password"
                description="Choose a new password."
            >
                <p>form</p>
            </AuthLayout>,
        );

        expect(
            screen.getByRole('heading', { level: 1, name: 'Reset password' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Choose a new password.')).toBeInTheDocument();
    });

    /**
     * `two-factor-challenge` swaps its title through `setLayoutProps` after
     * first paint, so the layout has to survive a render with neither prop.
     */
    it('renders without a title or description', () => {
        render(
            <AuthLayout>
                <p>form</p>
            </AuthLayout>,
        );

        expect(screen.getByText('form')).toBeInTheDocument();
    });
});
