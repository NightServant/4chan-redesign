import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Clover checkbox.
 *
 * A 20px box with an 8px radius. Unchecked it is a 1.5px strong hairline on
 * the surface fill; checked it fills with the primary token and carries a
 * Lucide check mark. Focus is the 2px token outline at 2px offset.
 */
function Checkbox({
    className,
    ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
    return (
        <CheckboxPrimitive.Root
            data-slot="checkbox"
            className={cn(
                'peer size-5 shrink-0 rounded-sm border-[1.5px] border-border-strong bg-surface',
                'transition-[color,border-color,background-color] duration-150 ease-out',
                'hover:border-primary-line',
                'data-[state=checked]:border-primary data-[state=checked]:bg-primary',
                'data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                'aria-invalid:border-danger aria-invalid:outline-danger',
                'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border-strong',
                className,
            )}
            {...props}
        >
            <CheckboxPrimitive.Indicator
                data-slot="checkbox-indicator"
                className="flex items-center justify-center text-primary-foreground"
            >
                <Check
                    className="size-3.5"
                    strokeWidth={3}
                    aria-hidden="true"
                />
            </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
    );
}

export { Checkbox };
