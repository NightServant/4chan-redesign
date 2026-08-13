import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BoardAvatar } from '@/components/clover/board-avatar';
import { MachineValue } from '@/components/clover/machine-value';
import { Section } from '@/components/home/section';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { board as boardRoute } from '@/routes';
import type { Board } from '@/types/clover';

/**
 * The homepage's sample of the directory, as a scrolling rail.
 *
 * The boards are whatever the server sent, which is only ever boards this
 * visitor may see: a signed-out anon never receives the not-worksafe ones, so
 * there is nothing here to filter and nothing to leak.
 *
 * ## The heading
 *
 * It read `8 boards, one interface`, counted from the cells on screen. The
 * count was honest about the cells and dishonest about the product: Clover
 * carries seventy-seven boards and this band shows eight of them, so the one
 * number a visitor took away was the wrong one by an order of magnitude.
 *
 * It now names the ordering instead, which is the true thing about this
 * particular eight: they are the boards holding the most threads.
 *
 * ## Scrolling
 *
 * A native scroll container with snap points, not a JavaScript carousel. The
 * cells are links, so tabbing through them scrolls the rail without any of
 * this code running, and a trackpad or a touchscreen works because the browser
 * already knows how. The buttons are a convenience on top of a thing that
 * already worked, which is the order those two should ever be built in.
 */
export interface BoardCarouselProps {
    boards: readonly Board[];
}

/** Cells are 260px wide plus a 12px gap. */
const CELL = 272;

function BoardCarousel({ boards }: BoardCarouselProps) {
    const rail = useRef<HTMLDivElement>(null);
    const [atStart, setAtStart] = useState(true);
    const [atEnd, setAtEnd] = useState(false);

    /**
     * Which arrows are usable. Read from the element rather than tracked as an
     * index, because the rail can also be moved by dragging, tabbing or a
     * trackpad, and an index would only know about presses.
     */
    const syncEdges = useCallback(() => {
        const el = rail.current;

        if (el === null) {
            return;
        }

        /* A pixel of slack: sub-pixel layout means `scrollLeft` at the far end
           lands a fraction short of the arithmetic, which would leave the
           forward arrow enabled with nowhere left to go. */
        setAtStart(el.scrollLeft <= 1);
        setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
    }, []);

    useEffect(() => {
        syncEdges();
    }, [syncEdges, boards]);

    const page = useCallback((direction: -1 | 1) => {
        const el = rail.current;

        if (el === null) {
            return;
        }

        /* Move by whole cells, never by a fraction of one. Scrolling by
               `clientWidth` leaves a half-cut cell at the edge, which then
               reads as the rail being broken rather than as there being more. */
        const cells = Math.max(1, Math.floor(el.clientWidth / CELL));

        /* Clamped to the track, not left to `scrollBy` to sort out.
               
               A smooth scroll that overshoots the final snap point is
               cancelled outright under `scroll-snap-type: mandatory`, and the
               rail returns to where it started: asking for +1088 with 1032 of
               travel left scrolled to 0. Pressing the arrow did nothing, and
               it did nothing only at the end of the rail, which is exactly
               where it would have been missed. */
        const furthest = el.scrollWidth - el.clientWidth;
        const target = Math.min(
            Math.max(el.scrollLeft + direction * cells * CELL, 0),
            furthest,
        );

        el.scrollTo({
            left: target,
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)')
                .matches
                ? 'auto'
                : 'smooth',
        });
    }, []);

    return (
        <Section
            id="boards"
            label="Popular boards"
            title="The boards carrying the most threads"
            action={
                boards.length === 0 ? undefined : (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            aria-label="Previous boards"
                            disabled={atStart}
                            onClick={() => page(-1)}
                        >
                            <ChevronLeft aria-hidden="true" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            aria-label="More boards"
                            disabled={atEnd}
                            onClick={() => page(1)}
                        >
                            <ChevronRight aria-hidden="true" />
                        </Button>
                    </div>
                )
            }
        >
            {boards.length === 0 ? (
                <p className="text-body-sm text-muted-foreground">
                    Boards appear here once they have been synced.
                </p>
            ) : (
                <div
                    ref={rail}
                    onScroll={syncEdges}
                    data-slot="board-rail"
                    /* Proximity, not mandatory. The cells do not divide evenly
                       into the rail, so the last resting place is mid-cell;
                       mandatory snapping insists on alignment there and fights
                       both the arrows and a trackpad flick. */
                    className="flex snap-x snap-proximity [scrollbar-width:none] gap-3 overflow-x-auto [&::-webkit-scrollbar]:hidden"
                >
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
                            className="w-[260px] shrink-0 snap-start rounded-xl"
                        >
                            <Card
                                hoverLift
                                className="h-full flex-row items-center gap-3 px-4 py-3"
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

export { BoardCarousel };
