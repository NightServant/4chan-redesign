import { Link } from '@inertiajs/react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/**
 * The inline link used inside the auth card.
 *
 * The starter kit's `TextLink` underlines in `decoration-neutral-300`, a raw
 * Tailwind palette colour that has no dark counterpart in Clover's token set
 * and shifts hue away from the rest of the screen. Auth is the last place
 * still on that component, so these links carry the one green instead: green
 * marks action, which is exactly what an inline link is.
 */
type AuthLinkProps = ComponentProps<typeof Link>;

function AuthLink({ className, children, ...props }: AuthLinkProps) {
    return (
        <Link
            className={cn(
                'font-medium text-primary underline decoration-primary-line underline-offset-4',
                'transition-colors duration-[var(--duration-hover)] ease-standard',
                'hover:text-primary-hover hover:decoration-current',
                'focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                className,
            )}
            {...props}
        >
            {children}
        </Link>
    );
}

export { AuthLink };
export type { AuthLinkProps };
