import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AuthGate } from '@/components/clover/auth-gate';

/**
 * The real `Link` needs an Inertia page context that only exists inside
 * `createInertiaApp`. Stand in a plain anchor instead, following the pattern
 * in `app-sidebar.test.tsx`: still queryable by role and accessible name,
 * and its `href` is resolvable back to the route's URL.
 */
vi.mock('@inertiajs/react', () => ({
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

describe('AuthGate', () => {
    it('drops the action into the body copy', () => {
        render(
            <AuthGate
                action="reply to this thread"
                open
                onOpenChange={() => {}}
            />,
        );

        expect(
            screen.getByText(/You need an account to reply to this thread\./),
        ).toBeInTheDocument();
    });

    it('renders the exact standing copy around the interpolated action', () => {
        render(
            <AuthGate
                action="bookmark this thread"
                open
                onOpenChange={() => {}}
            />,
        );

        expect(
            screen.getByText(
                'Reading is open to everyone. You need an account to bookmark this thread. Posts stay anonymous, the account is never attached to them.',
            ),
        ).toBeInTheDocument();
    });

    it('titles the dialog "Create an account to continue"', () => {
        render(
            <AuthGate action="post a thread" open onOpenChange={() => {}} />,
        );

        expect(
            screen.getByRole('dialog', {
                name: 'Create an account to continue',
            }),
        ).toBeInTheDocument();
    });

    it('points the create-account control at register()', () => {
        render(
            <AuthGate action="post a thread" open onOpenChange={() => {}} />,
        );

        expect(
            screen.getByRole('link', { name: 'Create account' }),
        ).toHaveAttribute('href', '/register');
    });

    it('points the log-in affordance at login()', () => {
        render(
            <AuthGate action="post a thread" open onOpenChange={() => {}} />,
        );

        expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute(
            'href',
            '/login',
        );
    });

    it('closes the gate when "Keep browsing" is activated, without navigating', async () => {
        const user = userEvent.setup();
        const onOpenChange = vi.fn();

        render(
            <AuthGate
                action="post a thread"
                open
                onOpenChange={onOpenChange}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'Keep browsing' }));

        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('renders nothing when closed', () => {
        render(
            <AuthGate
                action="post a thread"
                open={false}
                onOpenChange={() => {}}
            />,
        );

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});
