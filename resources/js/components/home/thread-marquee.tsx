import { MachineValue } from '@/components/clover/machine-value';
import { cn } from '@/lib/utils';
import type { Thread } from '@/types/clover';

/**
 * A slow column of real threads, drifting.
 *
 * The homepage claims Clover carries the same boards and threads as 4chan.
 * This is that claim, shown rather than asserted: every row is a thread that
 * was actually ingested, with its real board, real title and real reply count.
 * A stock illustration or a mocked-up screenshot would have cost less and
 * proved nothing.
 *
 * Deliberately quiet. These are not `ThreadCard`s: a card carries borders, a
 * share button and a bookmark button, and sixteen of them sliding past the
 * pitch would compete with it. A row here is a slug, a title and a count on a
 * hairline, which is all that is needed to read as "this is a real board".
 *
 * ## Why it is hidden from assistive technology
 *
 * The list is rendered twice, because that is what makes a seamless loop. Read
 * aloud that is thirty-two titles, half of them duplicates, standing between a
 * visitor and the one button on the page. The threads are not exclusive to
 * this band either: every one is reachable from the feed the CTA leads to. So
 * the whole thing is `aria-hidden` and `inert` together, the same pairing the
 * hero preview used before it. `aria-hidden` alone would leave any focusable
 * child reachable but unannounced, which is worse than omitting it.
 */
type ThreadMarqueeProps = {
    threads: readonly Thread[];
    /**
     * Travel direction. The hero runs its two columns in opposition, which
     * reads as drift rather than as one list that happens to be cut in half.
     */
    direction?: 'up' | 'down';
    /**
     * Seconds for one full pass. Slow is the point: this is texture behind a
     * pitch, and anything quick enough to read word by word competes with the
     * headline for attention.
     */
    seconds?: number;
    className?: string;
};

function MarqueeRow({ thread }: { thread: Thread }) {
    return (
        <div className="flex flex-col gap-1.5 border-t border-border px-4 py-4">
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
    direction = 'up',
    seconds = 90,
    className,
}: ThreadMarqueeProps) {
    if (threads.length === 0) {
        return null;
    }

    return (
        <div
            data-slot="thread-marquee"
            aria-hidden="true"
            inert
            className={cn('relative overflow-hidden', className)}
            style={{
                /* An alpha mask on content, not a painted background: the
                   surface underneath stays the flat page colour the design
                   system requires. Without it the column is guillotined at
                   both ends, which reads as a clipping bug rather than as
                   something continuing past the edge. */
                maskImage:
                    'linear-gradient(to bottom, transparent, #000 14%, #000 86%, transparent)',
                WebkitMaskImage:
                    'linear-gradient(to bottom, transparent, #000 14%, #000 86%, transparent)',
            }}
        >
            <div
                data-slot="thread-marquee-track"
                className={cn(
                    'animate-thread-marquee',
                    /* Pausing on hover is not decoration. The rows are real
                       threads and a visitor who starts reading one should not
                       have it slide out from under them. */
                    'hover:[animation-play-state:paused]',
                    /* Anyone who asked for less motion gets a still column
                       rather than a fast one. The global reduced-motion rule
                       collapses durations, which for a looping translate would
                       leave the track parked at its end frame instead. */
                    'motion-reduce:animate-none',
                )}
                style={{
                    /* Longhands, not the `--marquee-duration` custom property
                       this used to set. The property never reached the
                       animation and every rail silently ran at the 90s
                       fallback, which is exactly the class of bug that looks
                       correct in the source and does nothing in the browser.
                       An inline longhand overrides the class shorthand and
                       can be read straight back off the element. */
                    animationDuration: `${seconds}s`,
                    animationDirection:
                        direction === 'down' ? 'reverse' : 'normal',
                }}
            >
                {/* Twice, and the duplicate is what makes the loop seamless.
                    The track travels exactly half its own height, so the
                    instant it wraps, the second copy is sitting where the
                    first one started. */}
                {[0, 1].map((copy) => (
                    <div key={copy}>
                        {threads.map((thread) => (
                            <MarqueeRow
                                key={`${copy}-${thread.no}`}
                                thread={thread}
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
