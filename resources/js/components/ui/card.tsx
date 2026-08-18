import type { ComponentProps } from 'react';
import { PatternField } from '@/components/clover/pattern-field';
import { cn } from '@/lib/utils';

/**
 * A hairline-bordered surface. Not the default wrapper: use it only where a
 * genuine container boundary helps. Cards never nest, and never rest with a
 * shadow.
 *
 * `cn` extends tailwind-merge with the Clover type scale, so a size and a
 * colour survive the same merge and a caller can override either.
 */

type CardProps = ComponentProps<'div'> & {
    /**
     * Strengthen the border and lift the card 1px on hover. Transform only,
     * so nothing reflows.
     */
    hoverLift?: boolean;
};

function Card({ className, hoverLift = false, children, ...props }: CardProps) {
    return (
        <div
            data-slot="card"
            className={`text-body ${cn(
                'relative isolate flex flex-col gap-6 overflow-hidden rounded-xl border border-border bg-surface py-6 text-foreground',
                hoverLift &&
                    'transition-[border-color,transform] duration-150 ease-standard hover:-translate-y-px hover:border-border-strong',
                className,
            )}`}
            {...props}
        >
            {/* The same drawn paper the bands and the chrome sit on, so a
                card reads as a piece of the page rather than a panel laid on
                top of one.

                `depth={0}`, deliberately. The parallax exists to make a
                full-width band drift as it passes; a card is a box inside a
                page that is already drifting, and a second rate of travel
                inside it reads as a mistake. Depth 0 also means no
                `overflow-clip` on the field itself, which is what took the
                header's search dropdown out the last time paper was put
                under a component that opens things -- and cards hold menus.

                A background layer rather than a wrapper, so every layout
                class a caller passes still lands on the card itself:
                `ProfileCommentList` passes `gap-0 py-0`, and a wrapper would
                have quietly stopped honouring it. */}
            <PatternField
                depth={0}
                feather={false}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10"
            />

            {children}
        </div>
    );
}

function CardHeader({ className, ...props }: ComponentProps<'div'>) {
    return (
        <div
            data-slot="card-header"
            className={cn('flex flex-col gap-1.5 px-6', className)}
            {...props}
        />
    );
}

function CardTitle({ className, ...props }: ComponentProps<'div'>) {
    return (
        <div
            data-slot="card-title"
            className={cn('text-h3 font-semibold', className)}
            {...props}
        />
    );
}

function CardDescription({ className, ...props }: ComponentProps<'div'>) {
    return (
        <div
            data-slot="card-description"
            className={`text-body-sm ${cn('text-muted-foreground', className)}`}
            {...props}
        />
    );
}

function CardContent({ className, ...props }: ComponentProps<'div'>) {
    return (
        <div
            data-slot="card-content"
            className={cn('px-6', className)}
            {...props}
        />
    );
}

function CardFooter({ className, ...props }: ComponentProps<'div'>) {
    return (
        <div
            data-slot="card-footer"
            className={`text-body-sm ${cn(
                'flex items-center gap-2 px-6 text-muted-foreground',
                className,
            )}`}
            {...props}
        />
    );
}

export {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
};
export type { CardProps };
