import { motion, useReducedMotion } from 'motion/react';
import type { ElementType } from 'react';
import { cn } from '@/lib/utils';

/**
 * Text that settles into place, one word at a time.
 *
 * Adapted from react-bits' `BlurText`, installed through the shadcn registry
 * (`@react-bits/BlurText-TS-TW`). Four things were changed, all of which the
 * vendored version would have failed on here:
 *
 *   - it rendered a hardcoded `<p>`, so it could not be the page's `<h1>`
 *   - it default-exported, against this codebase's named exports
 *   - it had no `prefers-reduced-motion` path at all
 *   - its default easing was linear, which reads as mechanical
 *
 * The mechanism is still theirs: per-word blur and lift, staggered by index.
 *
 * Timings are deliberately short. This is the page's largest text and its
 * first impression, and the vendored defaults (0.35s a step, 200ms of stagger)
 * left a seven-word headline invisible for well over a second. Watched on a
 * phone that reads as the page having failed to load rather than as a flourish.
 * At 0.42s with 38ms of stagger the whole line is legible inside 0.7s.
 *
 * This is motion applied to content that is already on the page, and it
 * resolves — after roughly a second the heading is exactly the static heading
 * the design system specifies, with no residue. That is the line this project
 * draws around react-bits: text and layout may move, surfaces stay flat.
 */
type BlurTextProps = {
    text: string;
    /** The element rendered. The hero needs an `h1`, not a paragraph. */
    as?: ElementType;
    className?: string;
    /** Milliseconds between one word starting and the next. */
    stagger?: number;
    /** Milliseconds before the first word starts. */
    delay?: number;
};

function BlurText({
    text,
    as: Tag = 'p',
    className,
    stagger = 38,
    delay = 0,
}: BlurTextProps) {
    const reduced = useReducedMotion();
    const words = text.split(' ');

    return (
        /* `flex flex-wrap` rather than inline spans: a blurred inline span
           bleeds over its neighbours' boxes mid-animation, which shows up as
           the line's baseline jittering as each word lands. */
        <Tag className={cn('flex flex-wrap', className)}>
            {words.map((word, index) => (
                <motion.span
                    key={`${word}-${index}`}
                    initial={
                        reduced
                            ? false
                            : { filter: 'blur(10px)', opacity: 0, y: 12 }
                    }
                    animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
                    transition={{
                        duration: 0.42,
                        delay: (delay + index * stagger) / 1000,
                        ease: [0.2, 0, 0, 1],
                    }}
                >
                    {word}
                    {/* A non-breaking space, and it has to be. Each word is a
                        flex item, and an ordinary space between flex items is
                        collapsed away entirely: the headline renders as
                        "Thesameboards." without this. The cost is that
                        `textContent` comes back with U+00A0 where the source
                        had U+0020, so anything asserting on it normalises. */}
                    {index < words.length - 1 ? '\u00a0' : null}
                </motion.span>
            ))}
        </Tag>
    );
}

export { BlurText };
export type { BlurTextProps };
