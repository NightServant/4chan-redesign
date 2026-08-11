import { Link } from '@inertiajs/react';
import { CheckIcon, PlusIcon } from 'lucide-react';
import { BoardAvatar } from '@/components/clover/board-avatar';
import { MachineValue } from '@/components/clover/machine-value';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { board as boardRoute } from '@/routes';
import type { BoardDirectoryEntry } from '@/types/clover';

export interface BoardCardProps {
    entry: BoardDirectoryEntry;
    subscribed: boolean;
    onToggleSubscribe: () => void;
}

/**
 * One board in the directory.
 *
 * The whole card reads as clickable, but only the board name is a link: the
 * stretched-link pattern from `ThreadCard` covers the card with a positioned
 * pseudo-element, and the footer row is `relative` so the subscribe button
 * paints above that stretch and keeps its own focus and click behaviour.
 *
 * The subscribe control names the board it acts on. Six buttons all called
 * "Subscribe" tell a screen reader nothing about which one is focused, and
 * the visible word stays inside the accessible name so voice control can
 * still say what it reads.
 */
export function BoardCard({
    entry,
    subscribed,
    onToggleSubscribe,
}: BoardCardProps) {
    /* Routes carry the bare token; the product form carries its delimiters. */
    const token = entry.slug.replaceAll('/', '');

    return (
        <Card hoverLift className="relative h-full gap-3 py-5">
            <div className="flex items-start gap-3 px-6">
                <BoardAvatar slug={entry.slug} size={40} decorative />

                <div className="flex min-w-0 flex-col gap-0.5">
                    <h3 className="font-display text-h3 font-semibold text-foreground">
                        <Link
                            href={boardRoute.url(token)}
                            className="static after:absolute after:inset-0 after:content-['']"
                        >
                            {entry.name}
                        </Link>
                    </h3>
                    <MachineValue>{entry.slug}</MachineValue>
                </div>
            </div>

            <p className="px-6 text-body-sm text-pretty text-muted-foreground">
                {entry.description}
            </p>

            <div className="relative mt-auto flex flex-wrap items-center justify-between gap-3 px-6">
                {/* An "anons online" figure used to lead this row. 4chan's
                    JSON API publishes no online count at any scope, so it was
                    dropped rather than estimated, and the row reports what the
                    board can actually be counted for. */}
                <MachineValue>{entry.threads} threads</MachineValue>

                <Button
                    variant={subscribed ? 'outline' : 'primary'}
                    size="sm"
                    aria-pressed={subscribed}
                    aria-label={
                        subscribed
                            ? `Subscribed to ${entry.slug}`
                            : `Subscribe to ${entry.slug}`
                    }
                    onClick={onToggleSubscribe}
                >
                    {subscribed ? (
                        <CheckIcon aria-hidden="true" />
                    ) : (
                        <PlusIcon aria-hidden="true" />
                    )}
                    {subscribed ? 'Subscribed' : 'Subscribe'}
                </Button>
            </div>
        </Card>
    );
}
