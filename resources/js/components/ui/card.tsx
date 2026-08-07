import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/**
 * A hairline-bordered surface. Not the default wrapper: use it only where a
 * genuine container boundary helps. Cards never nest, and never rest with a
 * shadow.
 *
 * tailwind-merge (inside `cn`) does not know Clover's type scale, so it reads
 * `text-body-sm` as a text colour and drops it next to `text-muted-foreground`.
 * Where a section needs both, the scale is applied outside the merge.
 */

type CardProps = ComponentProps<'div'> & {
    /**
     * Strengthen the border and lift the card 1px on hover. Transform only,
     * so nothing reflows.
     */
    hoverLift?: boolean;
};

function Card({ className, hoverLift = false, ...props }: CardProps) {
    return (
        <div
            data-slot="card"
            className={`text-body ${cn(
                'flex flex-col gap-6 rounded-xl border border-border bg-surface py-6 text-foreground',
                hoverLift &&
                    'transition-[border-color,transform] duration-150 ease-standard hover:-translate-y-px hover:border-border-strong',
                className,
            )}`}
            {...props}
        />
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
