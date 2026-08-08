import { cn } from '@/lib/utils';

/**
 * A loading placeholder. Green is the brand accent and never a large fill,
 * so the tint sits on a neutral surface instead.
 *
 * The shimmer is the one documented exception to "no decorative or
 * infinite-loop animation": the loop is the message. It still respects
 * `prefers-reduced-motion`, handled globally in `app.css` (`*,
 * *::before, *::after { animation-duration: 0.01ms !important; ... }`),
 * which wins over this component's animation regardless of specificity
 * because `!important` always beats a normal declaration.
 *
 * A skeleton is decorative, not content, so it is hidden from assistive
 * technology outright rather than announced as an empty or loading region.
 */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="skeleton"
            aria-hidden="true"
            className={cn(
                'animate-[pulse_1.4s_ease-in-out_infinite] rounded-md bg-surface-hover',
                className,
            )}
            {...props}
        />
    );
}

export { Skeleton };
