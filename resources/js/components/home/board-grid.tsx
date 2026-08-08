import { Link } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import { BoardAvatar } from '@/components/clover/board-avatar';
import { MachineValue } from '@/components/clover/machine-value';
import { Section } from '@/components/home/section';
import { Card } from '@/components/ui/card';
import { BOARDS } from '@/fixtures/clover';
import { popular } from '@/routes';

/**
 * The homepage's directory of boards.
 *
 * Board routes do not exist yet, so every cell points at `popular()` rather
 * than at a board of its own, which would 404 a first-time visitor. Each
 * cell has exactly one interactive element, so the anchor is the cell: no
 * div-with-onClick, no nested "card inside a link" indirection.
 */
function BoardGrid() {
    return (
        <Section
            id="boards"
            label="Popular boards"
            title="74 boards, one interface"
        >
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
                {BOARDS.map((board) => (
                    <Link
                        key={board.slug}
                        href={popular.url()}
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
                                    {board.slug} &middot; {board.online} online
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
        </Section>
    );
}

export { BoardGrid };
