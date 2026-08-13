import { Link } from '@inertiajs/react';
import type { ComponentProps } from 'react';
import { BlurText } from '@/components/clover/blur-text';
import { MachineValue } from '@/components/clover/machine-value';
import { PatternField } from '@/components/clover/pattern-field';
import { ThreadMarquee } from '@/components/home/thread-marquee';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { popular } from '@/routes';
import type { Thread } from '@/types/clover';

/**
 * The homepage's opening band: a centred thesis with a column of live threads
 * drifting down either side of it.
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
};

const HEADLINE = 'The same boards. Without the 2003 interface.';

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

function Hero({ threads, className, ...props }: HeroProps) {
    const half = Math.ceil(threads.length / 2);
    const left = threads.slice(0, half);
    const right = threads.slice(half);

    return (
        <section
            data-slot="hero"
            className={cn('border-b border-border', className)}
            {...props}
        >
            {/* Deepest on the page. The hero is the one band a reader sees
                before they have scrolled at all, so it has the most travel to
                spend and the most to gain from spending it. */}
            <PatternField depth={90} feather={false}>
                {/* Three columns on a wide screen, one on a narrow one. The rails
                are the first thing to go: on a phone there is no room for a
                column of ambient text beside the pitch, and stacking them
                above it would put texture before the argument. */}
                <div className="mx-auto grid max-w-[1180px] grid-cols-1 items-stretch gap-0 px-6 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)_minmax(0,260px)] lg:gap-10 lg:px-0">
                    <ThreadMarquee
                        threads={left}
                        direction="forward"
                        pixelsPerSecond={LEFT_RATE}
                        className="hidden h-[520px] border-x border-border lg:block"
                    />

                    <div className="flex flex-col items-center gap-6 py-20 text-center lg:py-24">
                        <BlurText
                            as="h1"
                            text={HEADLINE}
                            className="max-w-[22ch] justify-center font-display text-[clamp(34px,3.9vw,46px)] leading-[1.08] font-bold tracking-[-1px] text-balance text-foreground"
                        />

                        <p className="max-w-[46ch] text-[17px] leading-[1.55] text-pretty text-muted-foreground">
                            {INTRO}
                        </p>

                        <Button size="lg" asChild>
                            <Link href={popular()}>
                                Browse without an account
                            </Link>
                        </Button>

                        <MachineValue>
                            Free · Reading needs no account
                        </MachineValue>
                    </div>

                    <ThreadMarquee
                        threads={right}
                        direction="reverse"
                        pixelsPerSecond={RIGHT_RATE}
                        className="hidden h-[520px] border-x border-border lg:block"
                    />
                </div>
            </PatternField>
        </section>
    );
}

export { Hero };
export type { HeroProps };
