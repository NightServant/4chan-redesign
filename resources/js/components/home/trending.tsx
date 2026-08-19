import { Link } from '@inertiajs/react';
import { ChevronRightIcon } from 'lucide-react';
import { MachineValue } from '@/components/clover/machine-value';
import { Section } from '@/components/home/section';
import { ThreadMarquee } from '@/components/home/thread-marquee';
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

/**
 * One board, as a ruled row.
 *
 * These were pill chips: `rounded-full` with a border box each. Decision 1 of
 * the responsive plan is that Clover takes Reddit's information architecture
 * and keeps its own visual language — ruled hairlines, no cards, no pill
 * chips — because importing them undoes tasks 13 to 17. This was the last
 * place they survived, and it was on the homepage.
 *
 * They did not fit either. Each row carries a slug and a formatted count, so
 * at ~340px the six of them wrapped one per line and the band spent roughly
 * 250px listing six boards inside boxes.
 *
 * The pattern is `communities/board-row.tsx` from task 9, which answered the
 * identical problem: the rule belongs to the list (`divide-y`) rather than to
 * each item, so a stack of rows draws one continuous set of hairlines instead
 * of a column of doubled edges.
 */
/**
 * The whole cell reacts, not just the link's own colour.
 *
 * `hover:text-primary` was on this element on its own, and it changed nothing
 * anybody could see: both children set their own colour -- the slug is
 * `text-foreground`, the count is a `MachineValue` -- so an inherited colour
 * on the parent had nothing left to inherit it. The row looked interactive,
 * pointed somewhere real, and gave no feedback that the pointer was on it.
 *
 * `group` fixes that at the source: the row carries the state and each child
 * answers for its own colour under `group-hover`, which is the only way to
 * move a colour a child has already set. The background moves with them, so
 * the target reads as the whole cell rather than as the two words in it --
 * these cells are wide and mostly empty, and colouring only the text leaves a
 * pointer sitting in the middle of a row that looks inert.
 *
 * `group-focus-visible` alongside every `group-hover`: the same feedback for
 * the same control reached by keyboard, which the outline alone does not give
 * on a cell this size.
 */
const boardRowClasses = cn(
    'group flex items-center justify-between gap-3 p-6',
    'transition-colors duration-[var(--duration-hover)] ease-standard',
    'hover:bg-surface-hover focus-visible:bg-surface-hover',
    'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
);

/** Both children transition on the same token, so the row moves as one. */
const boardRowTransition =
    'transition-colors duration-[var(--duration-hover)] ease-standard';

/** Every cell draws its own right and bottom; see the list's own comment. */
const boardCellClasses = 'border-r border-b border-border';

/**
 * How many empty cells the last row needs to reach the right-hand rule.
 *
 * An odd count is the normal case here — the list is however many boards the
 * server sent — and a short last row would otherwise stop the horizontal rule
 * partway across the page. The columns change at two breakpoints, so the
 * number of fillers is different at `md` and at `lg` and each one is shown only
 * where it is needed. At one column no row is ever short.
 *
 * Returns the visibility class for each filler, in order, or an empty array
 * when both grids already come out even.
 */
function fillerVisibility(count: number): string[] {
    const atMd = (2 - (count % 2)) % 2;
    const atLg = (3 - (count % 3)) % 3;

    return Array.from({ length: Math.max(atMd, atLg) }, (_unused, index) => {
        if (index < atMd) {
            return index < atLg
                ? 'hidden md:block'
                : 'hidden md:block lg:hidden';
        }

        return 'hidden lg:block';
    });
}

function Trending({ threads, trending }: TrendingProps) {
    return (
        <Section
            id="trending"
            depth={72}
            label="Trending discussions"
            title="What is being bumped today"
            /* A heading-row link with a trailing chevron, which is what this
               codebase uses for "this section continues elsewhere" (task 7's
               `Posts ` on the search page). It was an outlined button, which
               made the loudest control on the band the one that merely goes to
               the feed the ticker below is already showing. */
            action={
                <Link
                    href={popular.url()}
                    className="inline-flex items-center gap-1.5 rounded-sm text-body-sm font-medium text-muted-foreground transition-colors duration-[var(--duration-hover)] ease-standard hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                    Open the feed
                    <ChevronRightIcon aria-hidden="true" className="size-4" />
                </Link>
            }
        >
            {trending.length > 0 ? (
                /* A hard grid, ruled on both axes: one column below `md`,
                   two at `md`, three at `lg` — the same grid and the same
                   breakpoints the features band uses, because two bands on one
                   page answering the same question differently is worse than
                   either answer.

                   One row per board across the full page put the slug at the
                   left edge and its count at the right with about 1,300px of
                   empty rule between them at 1420px. In a ~380px cell the pair
                   reads as one line.

                   The lines are the grid's own and each is drawn once: the
                   container carries the top and left edges, every cell carries
                   its right and bottom. No `:nth-child` scheme, which is what
                   makes it hold at all three column counts.

                   The left and right edges are the section's `border-x`, not
                   the grid's: two hairlines a pixel apart is what happens if
                   the grid draws its own. `-ml-6` cancels the content column's
                   left padding so the grid starts on the frame, and
                   `-mr-[25px]` is that same 24px plus one more, so the last
                   cell's right-hand rule falls exactly on the section's rather
                   than beside it. The padding the column used to give is now
                   `p-6` inside each cell.

                   The fillers close a short last row. See `fillerVisibility`. */
                <ul
                    aria-label="Boards by post volume"
                    className="-mr-[25px] -ml-6 grid border-t border-border md:grid-cols-2 lg:grid-cols-3"
                >
                    {trending.map((item) => (
                        <li key={item.tag} className={boardCellClasses}>
                            <Link
                                /* `tag` is a display slug like `/g/`; routes
                                   carry the bare token. */
                                href={boardRoute.url(
                                    item.tag.replaceAll('/', ''),
                                )}
                                className={boardRowClasses}
                            >
                                <span
                                    className={cn(
                                        'text-body-sm font-semibold text-foreground',
                                        boardRowTransition,
                                        'group-hover:text-primary group-focus-visible:text-primary',
                                    )}
                                >
                                    {item.tag}
                                </span>
                                <MachineValue
                                    className={cn(
                                        boardRowTransition,
                                        'group-hover:text-foreground group-focus-visible:text-foreground',
                                    )}
                                >
                                    {item.posts}
                                </MachineValue>
                            </Link>
                        </li>
                    ))}

                    {fillerVisibility(trending.length).map(
                        (visibility, index) => (
                            <li
                                key={`filler-${index}`}
                                aria-hidden="true"
                                data-slot="trending-filler"
                                className={cn(boardCellClasses, visibility)}
                            />
                        ),
                    )}
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
