import { Link } from '@inertiajs/react';
import type { ComponentProps } from 'react';
import { MachineValue } from '@/components/clover/machine-value';
import { ThreadCard } from '@/components/clover/thread-card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { popular } from '@/routes';
import type { Thread } from '@/types/clover';

/**
 * The homepage's opening band: a split composition rather than a centred
 * headline, since a centred hero over a dark field is the single most
 * recognisable AI-generated layout.
 *
 * The right column previews real `ThreadCard`s rather than inventing a
 * screenshot or illustration, and the threads are whatever the page handed
 * down: ingested rows, not a fixture, so the preview is a sample of the site
 * rather than a mock of it.
 *
 * The stack stays out of the accessibility tree. Each card carries a title
 * link plus a full set of vote and bookmark controls, and a marketing hero is
 * the wrong place to hand a screen reader six controls that duplicate the CTA
 * beside them. So the whole stack is `aria-hidden` and `inert` together:
 * `aria-hidden` alone would leave its buttons focusable but silent, which is
 * worse than not exposing the stack at all.
 */
type HeroProps = Omit<ComponentProps<'section'>, 'children'> & {
    /**
     * The threads to preview, already sliced by the page. Empty is an
     * ordinary state, not a failure: before the first sync there is nothing
     * to show, and the hero's argument is made in the left column anyway.
     */
    threads: readonly Thread[];
};

const HEADLINE =
    'The same boards, threads and greentext. Without the 2003 interface.';

const INTRO =
    'Clover is an anonymous discussion platform built around boards instead of followers. No profiles on your posts, no recommendation feed, no ads.';

const GRID_BACKGROUND = {
    backgroundImage: [
        'repeating-linear-gradient(to right, var(--color-border) 0, var(--color-border) 1px, transparent 1px, transparent 64px)',
        'repeating-linear-gradient(to bottom, var(--color-border) 0, var(--color-border) 1px, transparent 1px, transparent 64px)',
    ].join(', '),
    maskImage:
        'radial-gradient(100% 80% at 30% 20%, #000 20%, transparent 75%)',
    WebkitMaskImage:
        'radial-gradient(100% 80% at 30% 20%, #000 20%, transparent 75%)',
};

function Hero({ threads, className, ...props }: HeroProps) {
    return (
        <section
            data-slot="hero"
            className={cn(
                'relative overflow-hidden border-b border-border',
                className,
            )}
            {...props}
        >
            <div
                data-slot="hero-grid"
                aria-hidden="true"
                className="absolute inset-0 opacity-50"
                style={GRID_BACKGROUND}
            />

            <div className="relative mx-auto grid max-w-[1180px] grid-cols-1 items-center gap-14 px-6 pt-18 pb-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
                <div className="flex max-w-[560px] flex-col gap-6">
                    <h1 className="font-display text-[clamp(34px,4.4vw,52px)] leading-[1.08] font-bold tracking-[-1px] text-balance text-foreground">
                        {HEADLINE}
                    </h1>

                    <p className="text-[17px] leading-[1.55] text-pretty text-muted-foreground">
                        {INTRO}
                    </p>

                    <div>
                        <Button size="lg" asChild>
                            <Link href={popular()}>
                                Browse without an account
                            </Link>
                        </Button>
                    </div>

                    {/* This line used to end "· 74 boards". Nothing produced
                        that 74: 4chan publishes 77 boards and shows a
                        visitor only the ones their settings permit, so the
                        figure was wrong for every reader of it. The board
                        count is stated once, by the grid below, where it is
                        counted from what is actually on the page. */}
                    <MachineValue>
                        Free · Reading needs no account · Posting does
                    </MachineValue>
                </div>

                {/* A spaced column, not a stack. The second card previously
                    sat `absolute` over the first, so its title printed
                    straight through the first card's body. Depth now comes
                    from opacity alone, which cannot collide with anything and
                    still reads as "there is more below". */}
                <div
                    data-slot="hero-thread-preview"
                    aria-hidden="true"
                    inert
                    className="flex flex-col gap-3"
                >
                    {threads.map((thread, index) => (
                        <ThreadCard
                            key={thread.no}
                            thread={thread}
                            className={cn(index > 0 && 'opacity-60')}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}

export { Hero };
export type { HeroProps };
