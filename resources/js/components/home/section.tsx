import { useId } from 'react';
import type { ReactNode } from 'react';
import { PatternField } from '@/components/clover/pattern-field';
import { SectionLabel } from '@/components/clover/section-label';
import { SectionGutter } from '@/components/home/section-gutter';
import { homeSectionOrdinal } from '@/lib/home-sections';
import { cn } from '@/lib/utils';

/**
 * One band of the homepage: a tracked label, a heading, an optional action,
 * then content.
 *
 * Sections are divided by a hairline, not by alternating background fills.
 * Striped bands are the standard marketing-page reflex and they chop a page
 * into unrelated slabs; a single surface with rules reads as one document.
 *
 * That surface is drawn paper now rather than a flat fill: every band sits on
 * the same module the layout is built on, and each band's paper drifts at its
 * own rate as it passes. One matrix throughout, header and footer included,
 * so the paper runs unbroken down the page.
 *
 * The content column is ruled on all four sides. Bands share their horizontal
 * rules with their neighbours, so a stack of them draws a single continuous
 * frame rather than a row of separate boxes with doubled edges between them.
 *
 * Outside that column, on displays wide enough to have any, are the band's
 * margins: a folio on the left, the band's name set vertically on the right.
 * See `SectionGutter` for what they carry and why they are marks rather than a
 * second navigation.
 */
type SectionProps = {
    /** Anchor target, so the page can be linked into. */
    id: string;
    /** How far the paper travels as the band passes. See `PatternField`. */
    depth?: number;
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
    depth = 60,
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
            <PatternField depth={depth}>
                {/* A row of three, not a centred column: the margins either
                    side are real columns now, so their marks can sit against
                    the far edge of the display instead of hugging the text. */}
                <div className="flex items-stretch justify-center">
                    <SectionGutter
                        side="left"
                        ordinal={homeSectionOrdinal(id)}
                        label={label}
                    />

                    <div className="mx-auto flex w-full max-w-(--measure-page) flex-col gap-6 border-x border-border px-6 py-14">
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

                    <SectionGutter
                        side="right"
                        ordinal={homeSectionOrdinal(id)}
                        label={label}
                    />
                </div>
            </PatternField>
        </section>
    );
}

export { Section };
export type { SectionProps };
