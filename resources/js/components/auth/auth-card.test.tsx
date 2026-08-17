import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AuthCard } from '@/components/auth/auth-card';

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

describe('AuthCard', () => {
    it('renders the title as the page heading', () => {
        render(
            <AuthCard title="Welcome back" description="Sign in to continue.">
                <p>form</p>
            </AuthCard>,
        );

        expect(
            screen.getByRole('heading', { level: 1, name: 'Welcome back' }),
        ).toBeInTheDocument();
    });

    it('renders the description under the title', () => {
        render(
            <AuthCard title="Welcome back" description="Sign in to continue.">
                <p>form</p>
            </AuthCard>,
        );

        expect(screen.getByText('Sign in to continue.')).toBeInTheDocument();
    });

    it('omits the description entirely when there is none', () => {
        const { container } = render(
            <AuthCard title="Welcome back">
                <p>form</p>
            </AuthCard>,
        );

        expect(
            container.querySelector('[data-slot="auth-card-description"]'),
        ).toBeNull();
    });

    /**
     * Below `lg` the brand panel is hidden, so this is the only way off the
     * auth screen without using the browser's back button.
     */
    it('offers a way back to the homepage', () => {
        render(
            <AuthCard title="Welcome back">
                <p>form</p>
            </AuthCard>,
        );

        expect(
            screen.getByRole('link', { name: 'Clover home' }),
        ).toHaveAttribute('href', '/');
    });

    /**
     * The other half of the 320px chrome. The form side already spends less on
     * padding below `sm`; a card still at `p-8` inside it would eat the saving
     * straight back. See `auth-split-layout.tsx`.
     */
    it('spends less of a narrow viewport on its own padding', () => {
        const { container } = render(
            <AuthCard title="Welcome back">
                <p>form</p>
            </AuthCard>,
        );

        const card = container.querySelector<HTMLElement>(
            '[data-slot="auth-card"]',
        );

        expect(card?.className).toMatch(/(^|\s)p-5(\s|$)/);
        expect(card?.className).toMatch(/(^|\s)sm:p-8(\s|$)/);
        expect(card?.className).not.toMatch(/(^|\s)p-8(\s|$)/);
    });

    it('renders the form it wraps', () => {
        render(
            <AuthCard title="Welcome back">
                <button type="button">Sign in</button>
            </AuthCard>,
        );

        expect(
            screen.getByRole('button', { name: 'Sign in' }),
        ).toBeInTheDocument();
    });
});
