import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/**
 * A read-progress bar: 4px tall, fully rounded, `bg-surface-hover` track.
 *
 * Finished is the only state worth colouring, so the fill stays `bg-faint`
 * until it reaches 100 and only then switches to `bg-primary`. The number
 * itself is always exposed to assistive technology through `aria-valuenow`;
 * `value` stays a plain prop so a caller holding the same number can render
 * it visibly too, rather than the bar being the only source of the figure.
 *
 * The fill is scaled with `transform: scaleX(...)`, never an animated
 * `width`, since width is a layout property.
 */
type ProgressProps = Omit<ComponentProps<'div'>, 'children'> & {
    /** 0-100. Values outside that range are clamped, not overflowed. */
    value: number;
    /** Accessible name for the progressbar role. Required. */
    label: string;
};

function Progress({ value, label, className, ...props }: ProgressProps) {
    const clamped = Math.min(100, Math.max(0, value));
    const finished = clamped >= 100;

    return (
        <div
            data-slot="progress"
            role="progressbar"
            aria-label={label}
            aria-valuenow={clamped}
            aria-valuemin={0}
            aria-valuemax={100}
            className={cn(
                'h-1 w-full overflow-hidden rounded-full bg-surface-hover',
                className,
            )}
            {...props}
        >
            <div
                data-slot="progress-fill"
                className={cn(
                    'h-full w-full origin-left rounded-full transition-[transform,background-color] duration-[var(--duration-state)] ease-standard',
                    finished ? 'bg-primary' : 'bg-faint',
                )}
                style={{ transform: `scaleX(${clamped / 100})` }}
            />
        </div>
    );
}

export { Progress };
export type { ProgressProps };
