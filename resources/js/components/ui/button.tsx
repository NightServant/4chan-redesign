import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/**
 * Clover's action primitive.
 *
 * Four real variants (primary, outline, ghost, danger). The shadcn names
 * `default`, `destructive` and `secondary` are kept as aliases so the settings
 * and auth pages inherited from the starter kit keep working.
 */

/** The button's own type scale. Merged, so a caller can override it. */
const typeScale = 'text-body-sm font-medium';

const primaryClasses =
    'bg-primary text-primary-foreground hover:not-disabled:bg-primary-hover active:not-disabled:bg-primary-pressed';

/** There is no danger-hover token, so hover and press shift luminance instead. */
const dangerClasses =
    'bg-danger text-background hover:not-disabled:brightness-110 active:not-disabled:brightness-95';

const secondaryClasses =
    'border border-border bg-surface-elevated text-foreground hover:not-disabled:bg-surface-hover';

const buttonVariants = cva(
    [
        'inline-flex w-fit shrink-0 items-center justify-center gap-2 whitespace-nowrap',
        'transition-[background-color,border-color,color,filter,transform] duration-150 ease-standard',
        'active:not-disabled:scale-[0.98]',
        'disabled:cursor-not-allowed disabled:opacity-60',
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    ],
    {
        variants: {
            variant: {
                primary: primaryClasses,
                outline:
                    'border border-border-strong bg-transparent text-foreground hover:not-disabled:bg-surface-hover',
                ghost: 'bg-transparent text-foreground hover:not-disabled:bg-surface-hover',
                danger: dangerClasses,
                /** Alias of `primary`, kept for starter-kit pages. */
                default: primaryClasses,
                /** Alias of `danger`, kept for starter-kit pages. */
                destructive: dangerClasses,
                /** Quiet filled action, kept for starter-kit pages. */
                secondary: secondaryClasses,
            },
            /**
             * Every size below `lg` grows its hit area on a coarse pointer.
             *
             * Only `icon` carried the utility, on the reading that a text
             * button is wide enough to hit -- which is true horizontally and
             * says nothing about the other axis: `sm` is 34px tall and `md`
             * 38px, both under the 44px minimum, and Join on the board page
             * was one of them. `lg` is already 44px. The painted control does
             * not change at any pointer size; `touch-target-44` grows the
             * area, not the box.
             */
            size: {
                sm: 'touch-target-44 h-8.5 px-3',
                md: 'touch-target-44 h-9.5 px-4',
                lg: 'h-11 px-5',
                icon: 'touch-target-44 size-9.5 p-0',
                /** Alias of `md`, kept for starter-kit pages. */
                default: 'touch-target-44 h-9.5 px-4',
            },
            pill: {
                true: 'rounded-full',
                false: 'rounded-md',
            },
        },
        defaultVariants: {
            variant: 'primary',
            size: 'md',
            pill: false,
        },
    },
);

type ButtonProps = ComponentProps<'button'> &
    VariantProps<typeof buttonVariants> & {
        /** Render the child element instead of a `button`, keeping the styles. */
        asChild?: boolean;
    };

function Button({
    className,
    variant,
    size,
    pill = false,
    asChild = false,
    ...props
}: ButtonProps) {
    const Comp = asChild ? Slot : 'button';

    return (
        <Comp
            data-slot="button"
            className={cn(
                typeScale,
                buttonVariants({ variant, size, pill }),
                className,
            )}
            {...props}
        />
    );
}

export { Button, buttonVariants };
export type { ButtonProps };
