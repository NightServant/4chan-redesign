import { CloverIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/**
 * The brand mark. `Mark` is the glyph alone, `Wordmark` is the glyph plus the
 * word `clover`, always lowercase.
 *
 * The design prototype masks a PNG for the glyph. We use a Lucide icon
 * instead: a raster mask cannot recolour cleanly across light and dark
 * themes, and it costs a network request for one glyph that vector icons
 * already give us for free. `CloverIcon` is the closest match, a literal
 * four-leaf shape rather than a generic leaf.
 *
 * Neither component renders a link. The caller wraps it in one when the mark
 * should navigate, keeping this file free of routing concerns.
 */

/**
 * A `Mark` is either meaningful or decorative, and the type makes you say
 * which. Requiring `aria-label` unconditionally sounds safer but is not: the
 * only way to render the glyph as wallpaper was `aria-label="" aria-hidden`,
 * which is a labelled image asserting it has no name. Naming the decorative
 * case outright is honest, and it keeps the two spellings from drifting.
 */
type MarkProps = Omit<ComponentProps<typeof CloverIcon>, 'aria-label'> &
    (
        | {
              /**
               * Accessible name. Required when the mark carries meaning:
               * standalone the glyph is the only content, so unlike
               * `Wordmark` it cannot fall back on adjacent text.
               */
              'aria-label': string;
              decorative?: false;
          }
        | {
              /** Pure ornament. Taken out of the accessibility tree. */
              decorative: true;
              'aria-label'?: never;
          }
    );

function Mark({ size = 20, className, decorative, ...props }: MarkProps) {
    return (
        <CloverIcon
            size={size}
            role={decorative ? undefined : 'img'}
            aria-hidden={decorative ? true : undefined}
            className={cn('text-primary', className)}
            {...props}
        />
    );
}

type WordmarkProps = Omit<ComponentProps<'span'>, 'children'> & {
    /** Glyph size in px. The word's type scale is fixed, not tied to this. */
    size?: number;
};

function Wordmark({ size = 18, className, ...props }: WordmarkProps) {
    return (
        <span
            data-slot="wordmark"
            className={cn('inline-flex items-center gap-1.5', className)}
            {...props}
        >
            <CloverIcon
                size={size}
                aria-hidden="true"
                className="text-primary"
            />
            <span className="font-display text-h3 font-semibold text-foreground lowercase">
                clover
            </span>
        </span>
    );
}

export { Mark, Wordmark };
export type { MarkProps, WordmarkProps };
