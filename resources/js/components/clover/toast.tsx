import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * The row's tone. Each pairs a distinct icon shape with a distinct colour, so
 * the meaning never rests on colour alone.
 */
export type ToastTone = 'success' | 'danger' | 'warning' | 'info';

const toneIcon: Record<ToastTone, LucideIcon> = {
    success: CircleCheck,
    danger: CircleAlert,
    warning: TriangleAlert,
    info: Info,
};

const toneIconClasses: Record<ToastTone, string> = {
    success: 'text-success',
    danger: 'text-danger',
    warning: 'text-warning',
    info: 'text-accent-text',
};

export type ToastProps = Omit<ComponentProps<'div'>, 'title'> & {
    tone: ToastTone;
    /** Rendered at `text-body-sm` medium. */
    title: ReactNode;
    /** Optional supporting line, rendered at `text-caption`. */
    message?: ReactNode;
    /** Called when the dismiss control is activated. */
    onDismiss?: () => void;
    /** Accessible name for the dismiss control. */
    dismissLabel?: string;
};

/**
 * The presentational toast row: leading tone icon, title, optional message
 * and a dismiss control. A danger toast is an assertive live region so it
 * interrupts; every other tone is polite so it does not.
 */
export function Toast({
    tone,
    title,
    message,
    onDismiss,
    dismissLabel = 'Dismiss',
    className,
    ...props
}: ToastProps) {
    const ToneIcon = toneIcon[tone];

    return (
        <div
            data-slot="toast"
            role={tone === 'danger' ? 'alert' : 'status'}
            aria-live={tone === 'danger' ? 'assertive' : 'polite'}
            className={cn(
                'flex w-full max-w-sm items-start gap-3 rounded-xl border border-border bg-surface-elevated p-4 shadow-overlay',
                'animate-in duration-[var(--duration-enter)] ease-[var(--ease-out)] fade-in-0 slide-in-from-bottom-1',
                className,
            )}
            {...props}
        >
            <ToneIcon
                aria-hidden="true"
                className={cn('mt-0.5 size-4 shrink-0', toneIconClasses[tone])}
            />

            <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-body-sm font-medium text-foreground">
                    {title}
                </p>
                {message ? (
                    <p className="text-caption text-muted-foreground">
                        {message}
                    </p>
                ) : null}
            </div>

            <button
                type="button"
                onClick={() => onDismiss?.()}
                className={cn(
                    'shrink-0 rounded-sm p-1 text-faint transition-colors',
                    'duration-[var(--duration-hover)] ease-[var(--ease-standard)]',
                    'hover:not-disabled:bg-surface-hover hover:not-disabled:text-foreground',
                )}
            >
                <X aria-hidden="true" className="size-4" />
                <span className="sr-only">{dismissLabel}</span>
            </button>
        </div>
    );
}
