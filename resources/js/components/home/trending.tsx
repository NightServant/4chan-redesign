import { Link } from '@inertiajs/react';
import { MachineValue } from '@/components/clover/machine-value';
import { Section } from '@/components/home/section';
import { ThreadMarquee } from '@/components/home/thread-marquee';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { board as boardRoute, popular } from '@/routes';
import type { Thread, TrendingTag } from '@/types/clover';

/**
 * A short strip of what is currently being bumped, over a row of the boards
 * carrying the most posts.
 *
 * Both come from the server. Thread routes exist now, so each card links to
 * its own thread rather than to the feed, and each board chip links to its
 * board: a first-time visitor who clicks one lands on the thing they clicked.
 *
 * The chips are boards, not tags. `TrendingTag.tag` held a hashtag while the
 * screens ran on fixtures, and 4chan has no tags to import — the field now
 * carries a board's display slug and a real reply total, so the row is
 * labelled and linked as boards.
 *
 * ## Why the threads are a ticker
 *
 * They were a grid of `ThreadCard`s, which put a third grid on a page that
 * already had two, and gave three threads the same visual weight as the
 * pitch above them. What is being bumped right now is a *feed* — the value is
 * that it is live and that there is more of it than fits — and a ticker says
 * both without claiming the room a grid claims.
 *
 * It also drops three cards' worth of share and bookmark controls from a band
 * whose real call to action is the button in its header.
 */
export interface TrendingProps {
    /** Threads to card, already sliced by the page. */
    threads: readonly Thread[];
    /** Boards ranked by post volume. Rendered in the order given. */
    trending: readonly TrendingTag[];
}

const chipClasses = cn(
    'inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5',
    'transition-colors duration-[var(--duration-hover)] ease-standard hover:bg-surface-hover',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
);

function Trending({ threads, trending }: TrendingProps) {
    return (
        <Section
            id="trending"
            pattern="grid"
            depth={72}
            label="Trending discussions"
            title="What is being bumped today"
            action={
                <Button asChild variant="outline">
                    <Link href={popular.url()}>Open the feed</Link>
                </Button>
            }
        >
            {trending.length > 0 ? (
                <ul
                    aria-label="Boards by post volume"
                    className="flex flex-wrap gap-2"
                >
                    {trending.map((item) => (
                        <li key={item.tag}>
                            <Link
                                /* `tag` is a display slug like `/g/`; routes
                                   carry the bare token. */
                                href={boardRoute.url(
                                    item.tag.replaceAll('/', ''),
                                )}
                                className={chipClasses}
                            >
                                <span className="text-body-sm font-semibold text-foreground">
                                    {item.tag}
                                </span>
                                <MachineValue>{item.posts}</MachineValue>
                            </Link>
                        </li>
                    ))}
                </ul>
            ) : null}

            {threads.length > 0 ? (
                /* Full width, breaking the band's own padding: a ticker that
                   stops short of the edges reads as a component sitting in a
                   page, and this one should read as the page's own edge. */
                <ThreadMarquee
                    threads={threads}
                    axis="x"
                    pixelsPerSecond={80}
                    className="-mx-6 border-y border-border"
                />
            ) : (
                <p className="text-body-sm text-muted-foreground">
                    Threads appear here once a board has been synced.
                </p>
            )}
        </Section>
    );
}

export { Trending };
