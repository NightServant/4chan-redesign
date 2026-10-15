import type { ComponentProps } from 'react';
import { BlurText } from '@/components/clover/blur-text';
import { MachineValue } from '@/components/clover/machine-value';
import { PatternField } from '@/components/clover/pattern-field';
import { SectionGutter } from '@/components/home/section-gutter';
import { ThreadMarquee } from '@/components/home/thread-marquee';
import { homeSectionOrdinal } from '@/lib/home-sections';
import { cn } from '@/lib/utils';
import type { Thread } from '@/types/clover';

/**
 * The homepage's opening band: a thesis set like a title page, with a column
 * of live threads drifting down either side of it.
 *
 * The columns are the argument. This page says Clover carries the same boards
 * and threads as 4chan, and the two rails are that sentence made checkable —
 * real slugs, real titles, real reply counts, ingested rows rather than a
 * mockup. A visitor can read one and go and find it.
 *
 * ## What was here before
 *
 * A split composition: headline left, two `ThreadCard`s stacked right, over a
 * ruled grid drawn in repeating gradients. Three things replaced it.
 *
 * The ruled grid that used to sit here went, came back as a moving layer, and
 * has now gone again in favour of the dot matrix every other band carries. One
 * pattern down the whole page is a surface; two alternating is two systems.
 *
 * Two preview cards became sixteen marquee rows because two cards from
 * whichever board bumped most recently could easily both be /v/, which
 * undersells a site carrying seventy-seven boards. The rails now take one
 * thread per board.
 *
 * The copy was cut roughly in half. A centred column reads badly past about
 * ten words a line, and the old intro paragraph was three lines of it.
 *
 * The thesis then moved off the centre line. It reads left to right like
 * every band below it, sits centred top to bottom between the rails, and is
 * green on dark paper. It still settles in word by word, one sentence to a
 * line, the second picking up the stagger where the first leaves off; the
 * whole headline is legible inside 0.7s, and at once under reduced motion.
 */
type HeroProps = Omit<ComponentProps<'section'>, 'children'> & {
    /**
     * Threads for the two rails, already one-per-board from the server. Split
     * down the middle here: first half left, second half right.
     *
     * Empty is an ordinary state rather than a failure. Before the first sync
     * there is nothing to show, the rails render nothing, and the thesis in
     * the middle still stands on its own.
     */
    threads: readonly Thread[];

    /**
     * Boards this visitor can reach, counted on the server within their own
     * visibility. The same figure the closing band quotes, so the two cannot
     * disagree.
     */
    boardCount: number;
};

/**
 * Two sentences, one to a line. Left to one flowing line the break fell
 * wherever the column ran out, which split "the 2003 interface" from its verb
 * as often as not. The second sentence may still wrap on a narrow column; the
 * first never shares a line with it.
 *
 * "2003 interface." is joined by a non-breaking space, so it settles in as one
 * unit. Word by word, each word is a flex item, nothing balances the wrap, and
 * at 1440 "interface." was left alone on a third line. Bound, it measures 253px
 * at the 36px floor, inside the 272px a 320px phone gives the column.
 */
const HEADLINE = [
    'The same boards.',
    'Without the 2003\u00a0interface.',
] as const;

/** `BlurText`'s own stagger, so the second line continues the first's beat. */
const WORD_STAGGER = 38;

const INTRO =
    'Anonymous discussion, organised by board. No profiles, no algorithm, no ads.';

/**
 * Rates, in pixels per second, not durations. Slower on the right and not by
 * accident: two columns travelling at identical speeds in opposite directions
 * read as one mechanism, which draws the eye to the mechanism. Slightly out of
 * step, they read as weather.
 *
 * Both were roughly 10px/s, which was ambient to the point of being static.
 * A news ticker sits around 70 to 90; a column of stacked rows wants rather
 * less than a single line of headlines, so these land between the two.
 */
const LEFT_RATE = 52;
const RIGHT_RATE = 44;

/**
 * What the margins call this band. The hero has no kicker of its own — it
 * opens with the headline — so the folio names it for what it is rather than
 * repeating forty characters of headline down the side of the page.
 */
const GUTTER_LABEL = 'The pitch';

function Hero({ threads, boardCount, className, ...props }: HeroProps) {
    const half = Math.ceil(threads.length / 2);
    const left = threads.slice(0, half);
    const right = threads.slice(half);

    return (
        <section
            id="top"
            data-slot="hero"
            className={cn('border-b border-border', className)}
            {...props}
        >
            {/* Deepest on the page. The hero is the one band a reader sees
                before they have scrolled at all, so it has the most travel to
                spend and the most to gain from spending it. */}
            <PatternField depth={90} feather={false}>
                {/* The hero is the tallest band, so its margins are the
                    emptiest space on the page. They carry the same folio and
                    vertical name every other band does. */}
                <div className="flex items-stretch justify-center">
                    <SectionGutter
                        side="left"
                        ordinal={homeSectionOrdinal('top')}
                        label={GUTTER_LABEL}
                    />

                    {/* Three columns on a wide screen, one on a narrow one.
                        The rails are the first thing to go: on a phone there
                        is no room for a column of ambient text beside the
                        pitch, and stacking them above it would put texture
                        before the argument. */}
                    <div className="mx-auto grid w-full max-w-(--measure-page) grid-cols-1 items-stretch gap-0 px-6 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)_minmax(0,260px)] lg:px-0">
                        <ThreadMarquee
                            threads={left}
                            direction="forward"
                            pixelsPerSecond={LEFT_RATE}
                            className="hidden h-[520px] border-x border-border lg:block"
                        />

                        {/* A title page rather than a centred stack: the
                            thesis set left and centred top to bottom in the
                            space above the terms, which are ruled off at the
                            foot and meet the rails on either side. */}
                        <div className="flex flex-col gap-10 pt-14 lg:gap-0 lg:px-10 lg:pt-0">
                            <div className="flex flex-col gap-5 lg:my-auto lg:py-14">
                                {/* Green on dark paper only: #34C76F there,
                                    at 9:1, set as type rather than a fill.
                                    On light paper the headline stays the
                                    near-black every other heading uses. */}
                                <h1 className="font-display text-[clamp(36px,4.4vw,56px)] leading-[1.04] font-bold tracking-[-0.03em] text-foreground dark:text-primary">
                                    <BlurText
                                        as="span"
                                        text={HEADLINE[0]}
                                        stagger={WORD_STAGGER}
                                    />{' '}
                                    <BlurText
                                        as="span"
                                        text={HEADLINE[1]}
                                        stagger={WORD_STAGGER}
                                        delay={
                                            HEADLINE[0].split(' ').length *
                                            WORD_STAGGER
                                        }
                                    />
                                </h1>

                                <p className="max-w-[46ch] text-[17px] leading-[1.55] text-pretty text-muted-foreground">
                                    {INTRO}
                                </p>
                            </div>

                            {/* Muted, not faint: faint measures 4.4:1 on the
                                light paper, short of AA for text this size,
                                and this line is a fact a visitor reads. */}
                            <p className="-mx-6 border-t border-border px-6 py-5 lg:-mx-10 lg:px-10">
                                <MachineValue className="text-muted-foreground">
                                    {boardCount.toLocaleString('en')} boards ·
                                    Free · Reading needs no account
                                </MachineValue>
                            </p>
                        </div>

                        <ThreadMarquee
                            threads={right}
                            direction="reverse"
                            pixelsPerSecond={RIGHT_RATE}
                            className="hidden h-[520px] border-x border-border lg:block"
                        />
                    </div>

                    <SectionGutter
                        side="right"
                        ordinal={homeSectionOrdinal('top')}
                        label={GUTTER_LABEL}
                    />
                </div>
            </PatternField>
        </section>
    );
}

export { Hero };
export type { HeroProps };
