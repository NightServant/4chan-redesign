import { Link } from '@inertiajs/react';
import { BookOpen } from 'lucide-react';
import { BoardAvatar } from '@/components/clover/board-avatar';
import { MachineValue } from '@/components/clover/machine-value';
import { PostAttachment } from '@/components/clover/post-image';
import { Button } from '@/components/ui/button';
import { thread } from '@/routes';
import type { HistoryEntry } from '@/types/clover';

/** `/g/` becomes `g`, the bare form the `thread` route expects. */
function boardToken(slug: string): string {
    return slug.replaceAll('/', '');
}

type HistoryCardProps = {
    entry: HistoryEntry;
    /** Drops this entry from the list. Local state; there is no backend. */
};

/**
 * One previously-opened thread, presented exactly as the feed presents one.
 *
 * It was a bordered `Card` with a progress bar and a delete button. Three
 * things went:
 *
 * The **card** went, because the feed's rows stopped being cards and a history
 * of threads should look like the threads it is a history of.
 *
 * The **progress bar** went because it was always zero. Reading progress is
 * never measured — nothing on the thread page reports how far down an anon
 * got — so every row reported `0% read` under a bar that never moved. A
 * measurement nobody takes is not a measurement.
 *
 * The **delete button** went because the page has a Clear all, and a row of
 * bins invites the reader to curate a list that is only a record of what they
 * opened. Removing one entry is not a thing worth thirty controls.
 *
 * The row stays clickable everywhere through the stretched-link pattern the
 * feed uses: the title link paints a pseudo-element over the whole row, and
 * the trailing control sits `relative` above that stretch so it stays
 * independently clickable.
 */
function HistoryCard({ entry }: HistoryCardProps) {
    const href = thread({
        board: boardToken(entry.board),
        thread: entry.no,
    });

    return (
        <div
            data-slot="history-row"
            className="relative flex flex-row items-center gap-4 border-b border-border px-5 py-4"
        >
            {/* The thread's own attachment, or nothing when it opened
                without one. It was a required label while history was a
                fixture, which meant every row claimed an image. */}
            <PostAttachment
                media={entry.media}
                className="hidden w-[132px] shrink-0 sm:block"
            />

            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-center gap-2">
                    <BoardAvatar slug={entry.board} size={20} decorative />
                    <MachineValue>
                        {`${entry.board} · ${entry.when} · >>${entry.no}`}
                    </MachineValue>
                </div>

                <h3 className="font-display text-[17px] leading-snug font-semibold text-balance text-foreground">
                    <Link
                        href={href}
                        className="static transition-colors duration-[var(--duration-hover)] ease-standard after:absolute after:inset-0 after:content-[''] hover:text-primary"
                    >
                        {entry.title}
                    </Link>
                </h3>
            </div>

            <div className="relative flex shrink-0 items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                    <Link href={href}>
                        <BookOpen aria-hidden="true" />
                        Continue reading
                    </Link>
                </Button>
            </div>
        </div>
    );
}

export { HistoryCard };
export type { HistoryCardProps };
