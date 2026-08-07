import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/**
 * A status pill: sticky, locked, archived, report counts. Semantic tones are
 * a soft tint plus coloured text, never a saturated fill, so a row of posts
 * never turns into a traffic light.
 */

/**
 * tailwind-merge (inside `cn`) does not know Clover's type scale, so it reads
 * `text-caption` as a text colour and drops it next to `text-danger`. Applying
 * the scale outside the merge keeps both. Remove the split once `cn` is taught
 * the Clover font sizes.
 */
const typeScale = 'text-caption font-medium';

const badgeVariants = cva(
    "inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-full px-2 py-0.5 whitespace-nowrap [&>svg]:pointer-events-none [&>svg:not([class*='size-'])]:size-3",
    {
        variants: {
            tone: {
                neutral: 'bg-surface-elevated text-muted-foreground',
                primary: 'bg-primary-soft text-accent-text',
                danger: 'bg-danger-soft text-danger',
                warning: 'bg-warning-soft text-warning',
                success: 'bg-primary-soft-strong text-accent-text',
            },
        },
        defaultVariants: {
            tone: 'neutral',
        },
    },
);

type BadgeProps = ComponentProps<'span'> &
    VariantProps<typeof badgeVariants> & {
        /** Render the child element instead of a `span`, keeping the styles. */
        asChild?: boolean;
    };

function Badge({ className, tone, asChild = false, ...props }: BadgeProps) {
    const Comp = asChild ? Slot : 'span';

    return (
        <Comp
            data-slot="badge"
            className={`${typeScale} ${cn(badgeVariants({ tone }), className)}`}
            {...props}
        />
    );
}

export { Badge, badgeVariants };
export type { BadgeProps };
