import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import AuthLayout from '@/layouts/auth-layout';

vi.mock('@inertiajs/react', () => ({
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
