import { ImageIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { MachineValue } from '@/components/clover/machine-value';
import { cn } from '@/lib/utils';

/**
 * Clover never invents media. An attachment renders as a labelled placeholder
 * carrying its filename, dimensions and size, not an `<img>`.
 *
 * The repo's `PlaceholderPattern` (an SVG weave) was considered and rejected:
 * a repeating pattern is texture, which the product rules ban outright. A
 * flat bordered surface is the compliant read of "placeholder".
 *
 * `role="img"` with a single accessible name is what lets a screen reader
 * learn there is an attachment and what it is, in one announcement, rather
 * than piecing it together from a decorative icon plus loose text.
 */
type MediaPlaceholderProps = ComponentProps<'div'> & {
    /** Filename, dimensions and size, pre-formatted. Not re-formatted here. */
    label: string;
    /** Surface height in px. */
    height?: number;
};

function MediaPlaceholder({
    label,
    height = 240,
    className,
    style,
    ...props
}: MediaPlaceholderProps) {
    return (
        <div
            data-slot="media-placeholder"
            role="img"
            aria-label={`Attachment: ${label}`}
            style={{ height, ...style }}
            className={cn(
                'flex items-center justify-center gap-2 rounded-lg border border-border bg-surface-elevated px-4',
                className,
            )}
            {...props}
        >
            <ImageIcon aria-hidden="true" className="size-4 text-faint" />
            <MachineValue className="text-faint">{label}</MachineValue>
        </div>
    );
}

export { MediaPlaceholder };
export type { MediaPlaceholderProps };
