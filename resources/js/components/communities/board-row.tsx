import { Link } from '@inertiajs/react';
import { CheckIcon, PlusIcon } from 'lucide-react';
import { BoardAvatar } from '@/components/clover/board-avatar';
import { MachineValue } from '@/components/clover/machine-value';
import { Button } from '@/components/ui/button';
import { board as boardRoute } from '@/routes';
import type { BoardDirectoryEntry } from '@/types/clover';

export interface BoardRowProps {
    entry: BoardDirectoryEntry;
    subscribed: boolean;
    onToggleSubscribe: () => void;
}

/**
 * One board in the directory: a ruled row below `md`, the card it used to be
 * at `md` and up.
 *
 * ## Why the card had to go below `md`
 *
 * At ~320px the directory's container is 272px. Each of the 53 boards was a
 * bordered card holding an avatar, a name, a slug, a 4chan `meta_description`
 * wrapping to three lines and a button on a line of its own — about a third of
 * the screen each, so four boards were reachable without scrolling on a page
 * whose entire job is getting anons to the other 49.
 *
 * A card is three things: a border, a radius and a fill. All three are gated
 * behind `md:` here, so below `md` the row has no box of its own and the
 * hairline between rows — `divide-y` on the list, not a border per row — is
 * the only rule drawn. The description is clamped to two lines rather than
 * truncated server-side, so the same string still sets in full inside the card
 * at `md`.
 *
 * ## The stretched link
 *
 * The whole row reads as clickable, but only the board name is a link: the
 * pattern from `ThreadCard` covers the row with a positioned pseudo-element,
 * and the footer is `relative` so the Join control paints above that stretch
 * and keeps its own focus and click behaviour.
 *
 * ## The Join control names its board
 *
 * Fifty-three buttons all called "Join" tell a screen reader nothing about
 * which one is focused. The visible word stays inside the accessible name so
 * voice control can still say what it reads, and the wording matches the board
 * page's control (task 8) rather than being a second verb for one action.
 */
export function BoardRow({
    entry,
    subscribed,
    onToggleSubscribe,
}: BoardRowProps) {
    /* Routes carry the bare token; the product form carries its delimiters. */
    const token = entry.slug.replaceAll('/', '');

    return (
        <div
            data-slot="board-row"
            className="relative flex h-full flex-col gap-1.5 py-4 transition-[border-color,transform] duration-150 ease-standard md:gap-3 md:rounded-xl md:border md:border-border md:bg-surface md:px-5 md:py-5 md:hover:-translate-y-px md:hover:border-border-strong"
        >
            <div
                data-slot="board-row-identity"
                className="flex min-w-0 items-center gap-2.5"
            >
                <BoardAvatar slug={entry.slug} size={36} decorative />

                <h3 className="min-w-0 flex-1 truncate font-display text-body-sm font-semibold text-foreground md:text-h3">
                    <Link
                        href={boardRoute.url(token)}
                        className="static after:absolute after:inset-0 after:content-['']"
                    >
                        {entry.name}
                    </Link>
                </h3>

                <MachineValue className="shrink-0">{entry.slug}</MachineValue>
            </div>

            <p className="line-clamp-2 text-body-sm text-pretty text-muted-foreground md:line-clamp-none">
                {entry.description}
            </p>

            <div
                data-slot="board-row-footer"
                className="relative mt-auto flex items-center justify-between gap-3 pt-0.5"
            >
                {/* An "anons online" figure used to lead this row. 4chan's
                    JSON API publishes no online count at any scope, so it was
                    dropped rather than estimated, and the row reports what the
                    board can actually be counted for. */}
                <MachineValue>
                    {entry.threads}{' '}
                    {entry.threads === '1' ? 'thread' : 'threads'}
                </MachineValue>

                <Button
                    type="button"
                    variant={subscribed ? 'outline' : 'primary'}
                    size="sm"
                    aria-pressed={subscribed}
                    aria-label={
                        subscribed
                            ? `Joined ${entry.slug}`
                            : `Join ${entry.slug}`
                    }
                    onClick={onToggleSubscribe}
                >
                    {subscribed ? (
                        <CheckIcon aria-hidden="true" />
                    ) : (
                        <PlusIcon aria-hidden="true" />
                    )}
                    {subscribed ? 'Joined' : 'Join'}
                </Button>
            </div>
        </div>
    );
}
