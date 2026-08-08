import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/**
 * Machine values: post numbers, board slugs, byte counts, dimensions, times.
 *
 * The design prototype sets these in a monospace face. Clover ships two fonts
 * and no mono, so the role is carried by Inter with tabular figures instead.
 * That is what monospace was actually doing here: holding digit columns still
 * so a count ticking from 999 to 1000 does not shift the row.
 */
type MachineValueProps = ComponentProps<'span'>;

function MachineValue({ className, ...props }: MachineValueProps) {
    return (
        <span
            data-slot="machine-value"
            className={cn(
                'font-sans text-caption text-faint tabular-nums',
                className,
            )}
            {...props}
        />
    );
}

export { MachineValue };
export type { MachineValueProps };
