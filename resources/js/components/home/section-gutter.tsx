import { MachineValue } from '@/components/clover/machine-value';
import { HOME_SECTION_TOTAL } from '@/lib/home-sections';
import { cn } from '@/lib/utils';

/**
 * The margin either side of a homepage band.
 *
 * Every band on this page is a 1180px column centred in the viewport. On a
 * laptop that is nearly the whole screen; on anything wider it leaves two
 * empty stripes of drawn paper running the height of the page, and the wider
 * the display the more of the page is margin. The complaint was that they read
 * as space nobody had decided what to do with, which is exactly what they were.
 *
 * They are now the page's margins in the book sense: the left one carries the
 * band's folio — its number, and how many bands there are — and the right one
 * carries the band's name set vertically. Between them runs a ruled measure on
 * the same 24px module as the dot matrix behind it, so the ticks land on the
 * paper's own grid rather than floating over it.
 *
 * ## Why these are marks and not navigation
 *
 * The obvious thing to put here is a jump list, and it was the first thing
 * tried. It does not survive contact with the page: a gutter belongs to one
 * band, so five bands render five copies, and five identical navigations is
 * five times the tab stops and five announcements of the same list. This
 * codebase has form for shipping controls that do nothing — the vote buttons,
 * "Load more", the pagination landmark — and a duplicated nav is the same
 * mistake wearing a better hat.
 *
 * So the margins are `aria-hidden`. A screen reader already has the band as a
 * named region with its heading; the folio would repeat the name it just read
 * and then read a decorative rule. Nothing here is information a reader cannot
 * get from the column, which is the test for whether a mark may be hidden.
 *
 * ## Why they only appear on wide displays
 *
 * Below `xl` there is no margin to fill — the column is the viewport — and
 * marks would have to come out of the content's own width to exist. They are
 * an answer to having too much room, so they appear only when there is.
 */
type SectionGutterProps = {
    /** Which margin this is. Decides the anchoring edge and what it carries. */
    side: 'left' | 'right';
    /** Two digits from `homeSectionOrdinal`, or null for a band off the list. */
    ordinal: string | null;
    /** The band's kicker, set vertically down the right margin. */
    label: string;
};

/**
 * The measure: a hairline ticked every 24px, which is `--pattern-size-dense`,
 * which is the spacing of the dots it is drawn over. Any other interval reads
 * as a second grid disagreeing with the first.
 */
const MEASURE =
    'bg-[repeating-linear-gradient(to_bottom,var(--color-border)_0_8px,transparent_8px_var(--pattern-size-dense))]';

function SectionGutter({ side, ordinal, label }: SectionGutterProps) {
    const isLeft = side === 'left';

    return (
        <div
            aria-hidden="true"
            data-slot="section-gutter"
            data-side={side}
            className={cn(
                'hidden min-w-0 flex-1 select-none xl:flex',
                /* Anchored to the outside edge, not to the column. Hugging the
                   column would leave the far edge as empty as it started. */
                isLeft ? 'justify-start pl-6' : 'justify-end pr-6',
            )}
        >
            <div className="flex flex-col items-center gap-3 py-14">
                {isLeft && ordinal !== null ? (
                    <MachineValue className="font-display text-[15px] font-semibold text-foreground">
                        {ordinal}
                    </MachineValue>
                ) : null}

                {!isLeft ? (
                    <span className="text-caption tracking-[0.18em] text-muted-foreground uppercase [writing-mode:vertical-rl]">
                        {label}
                    </span>
                ) : null}

                <div className={cn('w-px flex-1', MEASURE)} />

                {isLeft && ordinal !== null ? (
                    <MachineValue>
                        / {String(HOME_SECTION_TOTAL).padStart(2, '0')}
                    </MachineValue>
                ) : null}
            </div>
        </div>
    );
}

export { SectionGutter };
export type { SectionGutterProps };
