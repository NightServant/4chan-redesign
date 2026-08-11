import { Link } from '@inertiajs/react';
import { BookOpen, Trash2 } from 'lucide-react';
import { BoardAvatar } from '@/components/clover/board-avatar';
import { MachineValue } from '@/components/clover/machine-value';
import { MediaPlaceholder } from '@/components/clover/media-placeholder';
import { Progress } from '@/components/clover/progress';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { thread } from '@/routes';
import type { HistoryEntry } from '@/types/clover';

/** `/g/` becomes `g`, the bare form the `thread` route expects. */
function boardToken(slug: string): string {
    return slug.replaceAll('/', '');
}

type HistoryCardProps = {
    entry: HistoryEntry;
    /** Drops this entry from the list. Local state; there is no backend. */
    onRemove: () => void;
};

/**
 * One previously-opened thread.
 *
 * The card is clickable everywhere through the stretched-link pattern the
 * feed already uses: the title link paints a pseudo-element over the whole
 * card, and the trailing controls are given `position: relative` so they sit
 * above that stretch and stay independently clickable and focusable. Nesting
 * them inside the link instead would be invalid HTML.
 */
function HistoryCard({ entry, onRemove }: HistoryCardProps) {
    const href = thread({
        board: boardToken(entry.board),
        thread: entry.no,
    });

    return (
        <Card className="relative flex-row items-center gap-4 px-5 py-4">
            <MediaPlaceholder
                label={entry.media}
                height={82}
                className="hidden w-[132px] shrink-0 sm:flex"
            />

            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-center gap-2">
                    <BoardAvatar slug={entry.board} size={20} decorative />
                    <MachineValue>
                        {`${entry.board} · ${entry.when} · >>${entry.no}`}
                    </MachineValue>
                </div>

                <h3 className="font-display text-h3 font-semibold text-foreground">
                    <Link
                        href={href}
                        className="static after:absolute after:inset-0 after:content-['']"
                    >
                        {entry.title}
                    </Link>
                </h3>

                <div className="flex items-center gap-3">
                    <Progress
                        value={entry.progress}
                        label={`Read progress: ${entry.title}`}
                        className="max-w-[260px] flex-1"
                    />
                    <MachineValue className="shrink-0">
                        {entry.progress >= 100
                            ? 'Read'
                            : `${entry.progress}% read`}
                    </MachineValue>
                </div>
            </div>

            <div className="relative flex shrink-0 items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                    <Link href={href}>
                        <BookOpen aria-hidden="true" />
                        Continue reading
                    </Link>
                </Button>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Remove from history"
                            onClick={onRemove}
                        >
                            <Trash2 aria-hidden="true" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Remove from history</TooltipContent>
                </Tooltip>
            </div>
        </Card>
    );
}

export { HistoryCard };
export type { HistoryCardProps };
