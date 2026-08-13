import {
    motion,
    useReducedMotion,
    useScroll,
    useTransform,
} from 'motion/react';
import { useRef } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * A band of the page, drawn on visible paper.
 *
 * Clover's backgrounds were flat, and the rule that made them flat was written
 * against colour washes: gradients, texture, grain. That rule is amended here
 * rather than abandoned. What this paints is *structure* — the module the
 * layout is already built on, made visible — and structure is the one thing
 * brutalism actually asks for. A soft ramp behind a heading is still out.
 *
 * One pattern, everywhere. There was a ruled grid alternating with this matrix
 * band by band, which made the page two systems rather than one surface. Every
 * band now carries the same dots, including the header and the footer, so the
 * paper runs unbroken from the top of the page to the bottom.
 *
 * ## Why the pattern is its own layer
 *
 * It sits in an absolutely positioned child rather than on the band itself.
 * A background painted on the element that holds the text scrolls with the
 * text, locked to it, and stops reading as paper the moment it moves in
 * lockstep with the words. On its own layer it can move independently, which
 * is the entire point.
 *
 * ## Parallax
 *
 * The layer travels more slowly than the page. That is the whole trick: a
 * surface that lags behind its content is read as being *behind* it, and the
 * page gains a depth it cannot get from a static fill.
 *
 * Driven by `useScroll` against this band rather than the document, so each
 * band's paper responds to that band entering the viewport instead of every
 * band moving as one sheet. Bands with different `depth` values slide past
 * each other, which is what stops the page reading as a single flat image.
 *
 * `translateY` only, and only on a layer that is deliberately oversized top
 * and bottom, so travel never exposes an unpainted edge. It is a compositor
 * transform, so the scroll thread is never blocked.
 *
 * Anyone who asked for less motion gets the paper without the movement. The
 * pattern is not the animation and does not need to go with it.
 *
 * Clipped with `overflow-clip` rather than `overflow-hidden`. Both contain the
 * oversized layer, but `hidden` makes the element a scroll container, which
 * silently breaks `position: sticky` on anything inside it — the feed's rail
 * among them. `clip` does not.
 *
 * And clipped only when `depth` is greater than zero. A pinned layer has no
 * overhang to contain, and clipping anyway also clips whatever a child puts
 * outside the box: it hid the header's search dropdown outright.
 */
type PatternFieldProps = {
    children: ReactNode;
    /**
     * How far the paper travels across the band, in pixels. Larger reads as
     * further away. Zero pins it, which is what reduced motion resolves to.
     */
    depth?: number;
    /**
     * Fades the pattern out towards the band's edges, so bands meet on their
     * own hairline rather than on two grids colliding at different offsets.
     */
    feather?: boolean;
    className?: string;
    /** Applied to the content, not the band, so the paper is never inset. */
    contentClassName?: string;
};

const FEATHER =
    'linear-gradient(to bottom, transparent, #000 18%, #000 82%, transparent)';

function PatternField({
    children,
    depth = 60,
    feather = true,
    className,
    contentClassName,
}: PatternFieldProps) {
    const band = useRef<HTMLDivElement>(null);
    const reduced = useReducedMotion();

    /* `start end` to `end start` covers the whole time any part of the band is
       on screen, so the travel is spread across the full pass rather than
       finishing before the band is halfway up. */
    const { scrollYProgress } = useScroll({
        target: band,
        offset: ['start end', 'end start'],
    });

    const y = useTransform(
        scrollYProgress,
        [0, 1],
        reduced ? [0, 0] : [-depth, depth],
    );

    return (
        <div
            ref={band}
            data-slot="pattern-field"
            className={cn(
                'relative isolate',
                /* Clipped only when there is something to clip.
                   
                   The clip contains the paper's overhang, and the overhang
                   exists to cover the travel. At `depth={0}` there is neither,
                   so clipping buys nothing and costs a great deal: it also
                   clips anything a child positions outside the box, which took
                   the header's search dropdown with it the moment the chrome
                   was drawn on paper. */
                depth > 0 && 'overflow-clip',
                className,
            )}
        >
            <motion.div
                data-slot="pattern-field-paper"
                aria-hidden="true"
                style={{
                    y,
                    /* Overhangs the band by the travel distance at both ends,
                       so the moving layer can never uncover a bare strip. */
                    top: -depth,
                    bottom: -depth,
                    ...(feather
                        ? { maskImage: FEATHER, WebkitMaskImage: FEATHER }
                        : {}),
                }}
                className="pointer-events-none absolute inset-x-0 -z-10 bg-dots"
            />

            <div className={contentClassName}>{children}</div>
        </div>
    );
}

export { PatternField };
export type { PatternFieldProps };
