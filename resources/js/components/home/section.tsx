import { useId } from 'react';
import type { ReactNode } from 'react';
import { SectionLabel } from '@/components/clover/section-label';
import { cn } from '@/lib/utils';

/**
 * One band of the homepage: a tracked label, a heading, an optional action,
 * then content.
 *
 * Sections are divided by a hairline, not by alternating background fills.
 * Striped bands are the standard marketing-page reflex and they chop a page
 * into unrelated slabs; a single surface with rules reads as one document.
 */
type SectionProps = {
    /** Anchor target, so the page can be linked into. */
    id: string;
    /** Tracked uppercase kicker above the heading. */
    label: string;
    title: string;
    /** Optional control aligned to the heading, e.g. a link onward. */
    action?: ReactNode;
    children: ReactNode;
    className?: string;
};

function Section({
    id,
    label,
    title,
    action,
    children,
    className,
}: SectionProps) {
    const headingId = useId();

    return (
        <section
            id={id}
            aria-labelledby={headingId}
            className={cn('border-t border-border', className)}
        >
            <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-6 py-14">
                <div className="flex flex-wrap items-end justify-between gap-5">
                    <div className="flex flex-col gap-2">
                        <SectionLabel>{label}</SectionLabel>
                        <h2
                            id={headingId}
                            className="font-display text-[clamp(22px,2.4vw,30px)] font-semibold tracking-[-0.5px] text-balance"
                        >
                            {title}
                        </h2>
                    </div>
                    {action}
                </div>

                {children}
            </div>
        </section>
    );
}

export { Section };
export type { SectionProps };
