import type { ComponentProps, ReactNode } from 'react';
import { MachineValue } from '@/components/clover/machine-value';
import { cn } from '@/lib/utils';

/**
 * The title block every full-page screen opens with: an h1, an optional
 * machine-value description, and an optional trailing action.
 *
 * The heading level is fixed at 1 and not configurable. A page has exactly
 * one h1, and letting each caller pick is how a document outline ends up
 * with three of them or none.
 *
 * The description is a `MachineValue` because that is what it always carries
 * here — counts, sort order, storage scope, timestamps. Tabular figures keep
 * those digits from shifting the line as they change.
 */
type PageHeaderProps = Omit<ComponentProps<'div'>, 'title'> & {
    title: string;
    description?: ReactNode;
    /** Trailing control, e.g. a "Clear all" button. */
    action?: ReactNode;
};

function PageHeader({
    title,
    description,
    action,
    className,
    ...props
}: PageHeaderProps) {
    return (
        <div
            data-slot="page-header"
            className={cn(
                'flex flex-wrap items-end justify-between gap-x-4 gap-y-2',
                className,
            )}
            {...props}
        >
            <div className="flex min-w-0 flex-col gap-1">
                <h1 className="font-display text-h1 font-semibold text-foreground">
                    {title}
                </h1>

                {description ? (
                    <MachineValue data-slot="page-header-description">
                        {description}
                    </MachineValue>
                ) : null}
            </div>

            {action}
        </div>
    );
}

export { PageHeader };
export type { PageHeaderProps };
