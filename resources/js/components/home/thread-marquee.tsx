import { useEffect, useRef, useState } from 'react';
import { MachineValue } from '@/components/clover/machine-value';
import { cn } from '@/lib/utils';
import type { Thread } from '@/types/clover';

/**
 * Real threads, moving.
 *
 * The homepage claims Clover carries the same boards and threads as 4chan.
 * This is that claim shown rather than asserted: every row is a thread that
 * was actually ingested, with its real board, title and reply count. A stock
 * illustration would have cost less and proved nothing.
 *
 * Runs on either axis. Vertical rails flank the hero; a horizontal ticker
 * carries the trending band, which is the shape a news ticker has for the same
 * reason — headlines are wide and short, and reading a wide thing sideways
 * costs nothing.
 *
 * Deliberately quiet. These are not `ThreadCard`s: a card carries borders, a
 * share button and a bookmark button, and sixteen of them sliding past the
 * pitch would compete with it.
 *
 * ## Speed is a rate, not a duration
 *
 * It used to take `seconds` for one full pass, which sounds equivalent and is
 * not: the same duration over more rows is a faster rail, so adding threads
 * silently changed the speed of every rail that showed them. The content is
 * measured and the duration derived, so a rail travels at the rate it was
 * asked for whatever it happens to contain.
 *
 * ## Why it is hidden from assistive technology
 *
 * The list is rendered twice, because that is what makes a seamless loop. Read
 * aloud that is every title twice, standing between a visitor and the page.
 * The threads are not exclusive here either: each is reachable from the feed.
 * So the whole thing is `aria-hidden` and `inert` together — `aria-hidden`
 * alone would leave a focusable child reachable but unannounced.
 */
type ThreadMarqueeProps = {
    threads: readonly Thread[];
    /** The axis of travel. `y` scrolls a column, `x` runs a ticker. */
    axis?: 'x' | 'y';
    /**
     * Travel direction along that axis. Two rails in opposition read as drift
     * rather than as one list cut in half.
     */
    direction?: 'forward' | 'reverse';
    /**
     * How fast, in CSS pixels per second. A news ticker sits somewhere around
     * 70 to 90: quick enough to feel live, slow enough to finish a headline.
     */
    pixelsPerSecond?: number;
    className?: string;
};

/** Falls back to this until the content has been measured once. */
const ASSUMED_TRAVEL = 900;

function MarqueeRow({ thread, axis }: { thread: Thread; axis: 'x' | 'y' }) {
    return (
        <div
            className={cn(
                'flex flex-col gap-1.5 px-4 py-4',
                axis === 'y'
                    ? 'border-t border-border'
                    : 'w-[320px] shrink-0 border-l border-border',
            )}
        >
            <div className="flex items-center gap-2">
                <MachineValue className="text-foreground">
                    {thread.board}
                </MachineValue>
                <span className="truncate text-caption text-faint">
                    {thread.boardName}
                </span>
            </div>

            <p className="line-clamp-2 text-body-sm leading-snug text-pretty text-muted-foreground">
                {thread.title}
            </p>

            <MachineValue className="text-faint">
                {thread.replies} replies
            </MachineValue>
        </div>
    );
}

function ThreadMarquee({
    threads,
    axis = 'y',
    direction = 'forward',
    pixelsPerSecond = 55,
    className,
}: ThreadMarqueeProps) {
    const copy = useRef<HTMLDivElement>(null);
    const [travel, setTravel] = useState(ASSUMED_TRAVEL);

    /**
     * The distance one copy occupies, which is exactly how far the track moves
     * before it wraps. Watched rather than measured once: a rail's rows reflow
     * when the window changes width, and a duration derived from the old
     * height would leave it running at the wrong rate until a reload.
     */
    useEffect(() => {
        const el = copy.current;

        if (el === null || typeof ResizeObserver === 'undefined') {
            return;
        }

        const measure = (): void => {
            const size = axis === 'y' ? el.offsetHeight : el.offsetWidth;

            if (size > 0) {
                setTravel(size);
            }
        };

        measure();

        const observer = new ResizeObserver(measure);

        observer.observe(el);

        return () => observer.disconnect();
    }, [axis, threads]);

    if (threads.length === 0) {
        return null;
    }

    const seconds = Math.max(travel / pixelsPerSecond, 1);

    return (
        <div
            data-slot="thread-marquee"
            aria-hidden="true"
            inert
            className={cn('relative overflow-hidden', className)}
            style={{
                /* An alpha mask on content, not a painted background. Without
                   it the rail is guillotined at both ends, which reads as a
                   clipping bug rather than as something continuing past the
                   edge. */
                maskImage: `linear-gradient(to ${axis === 'y' ? 'bottom' : 'right'}, transparent, #000 12%, #000 88%, transparent)`,
                WebkitMaskImage: `linear-gradient(to ${axis === 'y' ? 'bottom' : 'right'}, transparent, #000 12%, #000 88%, transparent)`,
            }}
        >
            <div
                data-slot="thread-marquee-track"
                className={cn(
                    axis === 'y'
                        ? 'animate-thread-marquee'
                        : 'flex w-max animate-thread-marquee-x',
                    /* The rows are real threads, and a visitor who starts
                       reading one should not have it slide out from under
                       them. */
                    'hover:[animation-play-state:paused]',
                    /* The global reduced-motion rule collapses durations,
                       which for a looping translate parks the track at its end
                       frame. This stops it instead. */
                    'motion-reduce:animate-none',
                )}
                style={{
                    /* A longhand, not the `--marquee-duration` custom property
                       this once set: that property never reached the animation
                       and every rail silently ran at the stylesheet default. */
                    animationDuration: `${seconds}s`,
                    animationDirection:
                        direction === 'reverse' ? 'reverse' : 'normal',
                }}
            >
                {/* Twice, and the duplicate is what makes the loop seamless:
                    the track travels exactly half its own length, so the
                    instant it wraps the second copy is where the first began.
                    Only the first is measured, since they are identical. */}
                {[0, 1].map((index) => (
                    <div
                        key={index}
                        ref={index === 0 ? copy : undefined}
                        className={axis === 'x' ? 'flex shrink-0' : undefined}
                    >
                        {threads.map((thread) => (
                            <MarqueeRow
                                key={`${index}-${thread.no}`}
                                thread={thread}
                                axis={axis}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

export { ThreadMarquee };
export type { ThreadMarqueeProps };
