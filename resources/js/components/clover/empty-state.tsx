import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * The state a screen shows when it has nothing to show. Deliberately not a
 * card: an empty region framed in a border reads as a broken component, where
 * plain centred text reads as a considered absence.
 *
 * Copy passed in should be dry and specific about what will appear here and
 * why it has not. Clover does not apologise to anons.
 */
type EmptyStateProps = {
    /** Lucide icon. Decorative, so it is hidden from assistive technology. */
    icon?: ReactNode;
    title: string;
    body: string;
    action?: ReactNode;
    className?: string;
};

function EmptyState({ icon, title, body, action, className }: EmptyStateProps) {
    return (
        <div
            className={cn(
                'flex flex-col items-center gap-4 px-6 py-16 text-center',
                className,
            )}
        >
            {icon ? (
                <span
                    aria-hidden="true"
                    className={cn(
                        'grid size-14 place-items-center rounded-2xl',
                        'border border-border bg-surface text-faint',
                        "[&_svg:not([class*='size-'])]:size-5.5",
                    )}
                >
                    {icon}
                </span>
            ) : null}

            <div className="flex max-w-[46ch] flex-col gap-2">
                <h2 className="font-display text-h2 font-semibold text-foreground">
                    {title}
                </h2>
                <p className="text-body-sm text-pretty text-muted-foreground">
                    {body}
                </p>
            </div>

            {action}
        </div>
    );
}

export { EmptyState };
export type { EmptyStateProps };
