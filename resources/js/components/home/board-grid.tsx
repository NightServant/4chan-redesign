import { Link } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import { BoardAvatar } from '@/components/clover/board-avatar';
import { MachineValue } from '@/components/clover/machine-value';
import { Section } from '@/components/home/section';
import { Card } from '@/components/ui/card';
import { plural } from '@/lib/utils';
import { board as boardRoute } from '@/routes';
import type { Board } from '@/types/clover';

/**
 * The homepage's directory of boards.
 *
 * The boards are whatever the server sent, which is only ever boards this
 * visitor is allowed to see: a signed-out anon never receives the not-worksafe
 * ones, so there is nothing here to filter and nothing to leak. Board routes
 * exist now, so every cell points at its own board rather than at the feed.
 *
 * Each cell has exactly one interactive element, so the anchor is the cell: no
 * div-with-onClick, no nested "card inside a link" indirection.
 */
export interface BoardGridProps {
    boards: readonly Board[];
}

function BoardGrid({ boards }: BoardGridProps) {
    /* The heading counts the cells below it and nothing else. It used to read
       "74 boards, one interface", which was a figure with no source: 4chan
       publishes 77 boards and shows a visitor rather fewer, so any constant
       here was wrong for everybody. Counting what is actually on screen can
       never be. */
    return (
        <Section
            id="boards"
            label="Popular boards"
            title={`${plural(boards.length, 'board')}, one interface`}
        >
            {boards.length === 0 ? (
                <p className="text-body-sm text-muted-foreground">
                    Boards appear here once they have been synced.
                </p>
            ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
                    {boards.map((board) => (
                        <Link
                            key={board.slug}
                            /* Routes carry the bare token; the product form
                               carries its delimiters. Slugs are `[a-z0-9]+`
                               upstream, so `/3/` and `/s4s/` pass through
                               here unharmed. */
                            href={boardRoute.url(
                                board.slug.replaceAll('/', ''),
                            )}
                            aria-label={`${board.name}, ${board.slug}`}
                            className="rounded-xl"
                        >
                            <Card
                                hoverLift
                                className="flex-row items-center gap-3 px-4 py-3"
                            >
                                <BoardAvatar
                                    slug={board.slug}
                                    size={34}
                                    decorative
                                />
                                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                    <span className="truncate text-body-sm font-semibold text-foreground">
                                        {board.name}
                                    </span>
                                    <MachineValue>
                                        {board.slug} &middot; {board.threads}{' '}
                                        threads
                                    </MachineValue>
                                </div>
                                <ChevronRight
                                    aria-hidden="true"
                                    className="size-4 shrink-0 text-faint"
                                />
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </Section>
    );
}

export { BoardGrid };
