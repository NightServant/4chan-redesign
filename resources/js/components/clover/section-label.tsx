import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * The one place Clover breaks sentence case: an 11px tracked uppercase label
 * marking a region of a page.
 *
 * Uppercasing happens in CSS rather than in the string, so the accessible name
 * stays as written. Screen readers can spell out all-caps words letter by
 * letter, which turns "TRENDING" into seven characters of noise.
 */
type SectionLabelProps = Omit<ComponentProps<'div'>, 'children'> & {
    children: ReactNode;
    /** Optional trailing control, e.g. a "See all" link. */
    action?: ReactNode;
};

function SectionLabel({
    children,
    action,
    className,
    ...props
}: SectionLabelProps) {
    return (
        <div
            data-slot="section-label"
            className={cn(
                'flex min-h-5 items-center justify-between gap-3',
                className,
            )}
            {...props}
        >
            <span className="text-label font-semibold tracking-[1.2px] text-faint uppercase">
                {children}
            </span>
            {action}
        </div>
    );
}

export { SectionLabel };
export type { SectionLabelProps };
