import { Link } from '@inertiajs/react';
import type { ComponentProps } from 'react';
import { MachineValue } from '@/components/clover/machine-value';
import { ThreadCard } from '@/components/clover/thread-card';
import { Button } from '@/components/ui/button';
import { THREADS } from '@/fixtures/clover';
import { cn, toUrl } from '@/lib/utils';
import { popular } from '@/routes';

/**
 * The homepage's opening band: a split composition rather than a centred
 * headline, since a centred hero over a dark field is the single most
 * recognisable AI-generated layout.
 *
 * The right column previews two real `ThreadCard`s rather than inventing a
 * screenshot or illustration. Thread routes do not exist yet, so both are
 * pointed at `popular()` instead of their own thread. That also means both
 * would otherwise expose identical title links, plus a full set of vote and
 * bookmark controls, to assistive technology in the middle of a marketing
 * page. Since the CTA already states the real destination in words, the
 * whole preview stack is marked `aria-hidden` and `inert`: taken out of the
 * accessibility tree and the tab order together, rather than picking one
 * card to expose and hiding the other. `aria-hidden` alone would leave its
 * buttons focusable but silent to a screen reader, which is worse than not
 * exposing the stack at all.
 */
type HeroProps = Omit<ComponentProps<'section'>, 'children'>;

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

function Hero({ className, ...props }: HeroProps) {
    const previewThreads = [THREADS[0], THREADS[3]];

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

                    <MachineValue>
                        Free · Reading needs no account · Posting does · 74
                        boards
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
                    {previewThreads.map((thread, index) => (
                        <ThreadCard
                            key={thread.no}
                            thread={thread}
                            href={toUrl(popular())}
                            className={cn(index === 1 && 'opacity-60')}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}

export { Hero };
export type { HeroProps };
