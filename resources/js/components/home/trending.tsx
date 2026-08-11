import { Link } from '@inertiajs/react';
import { MachineValue } from '@/components/clover/machine-value';
import { ThreadCard } from '@/components/clover/thread-card';
import { Section } from '@/components/home/section';
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
 * The grid runs at a lower density than the boards band above it (wider
 * cards, bigger gap) so the two bands do not read as the same grid twice.
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
                                href={boardRoute.url(item.tag.replaceAll('/', ''))}
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
                <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-3.5">
                    {threads.map((thread) => (
                        <ThreadCard key={thread.no} thread={thread} />
                    ))}
                </div>
            ) : (
                <p className="text-body-sm text-muted-foreground">
                    Threads appear here once a board has been synced.
                </p>
            )}
        </Section>
    );
}

export { Trending };
