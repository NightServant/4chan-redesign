import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Clover multiline input.
 *
 * Shares the Input treatment: 10px radius, hairline border on the surface
 * fill, token focus outline that is never removed. Resizes vertically only so
 * a long reply cannot break the column it sits in.
 */
function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
    return (
        <textarea
            data-slot="textarea"
            className={cn(
                'flex min-h-24 w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-base text-foreground md:text-body',
                'transition-[color,border-color,background-color] duration-150 ease-out',
                'selection:bg-primary selection:text-primary-foreground placeholder:text-faint',
                'hover:border-border-strong',
                'focus-visible:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                'aria-invalid:border-danger aria-invalid:outline-danger',
                'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border',
                className,
            )}
            {...props}
        />
    );
}

export { Textarea };
