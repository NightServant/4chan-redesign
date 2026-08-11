import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * A flashed server message on an auth screen: a reset link sent, a password
 * changed, a verification mail resent.
 *
 * It is a live region because it appears after a navigation the anon just
 * triggered, and it is the only confirmation that anything happened. The
 * starter kit painted these `text-green-600`, a raw Tailwind colour that is
 * not Clover's green and has no dark-theme counterpart.
 */
type AuthStatusProps = {
    children: ReactNode;
    className?: string;
};

function AuthStatus({ children, className }: AuthStatusProps) {
    return (
        <p
            role="status"
            data-slot="auth-status"
            className={cn(
                'rounded-md border border-primary-line bg-primary-soft px-3 py-2 text-body-sm text-success',
                className,
            )}
        >
            {children}
        </p>
    );
}

export { AuthStatus };
export type { AuthStatusProps };
