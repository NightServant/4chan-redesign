import { Check, Plus } from 'lucide-react';
import { BoardAvatar } from '@/components/clover/board-avatar';
import { MachineValue } from '@/components/clover/machine-value';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useBoardSubscription } from '@/hooks/use-board-subscription';
import { cn } from '@/lib/utils';
import type { Board } from '@/types/clover';

/**
 * The board-agnostic line shown when a board has no description of its own.
 *
 * One fact true of every board on the product, not a summary of any board's
 * topic. It exists because inventing six lines of flavour text for `/x/` and
 * `/biz/` would be fabricating product copy.
 */
const GENERIC_DESCRIPTION = 'Anonymous threads, bumped by reply.';

type BoardHeaderProps = {
    board: Board & {
        /**
         * The board's own description, from 4chan's `meta_description`. Absent
         * on surfaces that only carry the short `Board` shape, which is why
         * this widens `Board` rather than requiring a new type everywhere.
         */
        description?: string;
    };
    className?: string;
};

/**
 * The board's identity strip above its thread list, on Reddit's information
 * architecture: avatar, title and slug with Join to the right; the description
 * on its own full-width row; the thread count as a `MachineValue` under it.
 *
 * ## Why the description moved out of the identity column
 *
 * All four used to share one row. `Button` is `shrink-0`, so the text column
 * was the only thing left that could give, and nothing let it shrink below its
 * own min-content width — which, for a column holding a paragraph, is the
 * width of the paragraph's longest word. At 320px "Video Games" broke onto two
 * lines and three sentences set at about ten characters each, running half the
 * screen. `min-w-0 flex-1` on the column lets it take the leftover space
 * instead of being sized by its contents, and the description, which needs the
 * whole measure, is out of that row entirely.
 *
 * ## What is not here
 *
 * Reddit's header also carries "219k visitors and 4.8k contributions per
 * week", Wiki / Top 50 / Top Members links, and Community highlights. Clover
 * counts no visitors, has no wiki, ranks nothing and curates nothing, so none
 * of it is rendered: a figure with nothing behind it is invented on every
 * render, which is the rule that deleted `Board.online`. The slug's
 * `MachineValue` used to read `/g/ · 41,208 online` for exactly that reason.
 *
 * Deliberately not a `Panel` or `Card`: the thread list underneath is already
 * a stack of cards, and wrapping this in one too would read as a second card
 * stacked on the first, which the taste laws rule out. A plain `hr` stands in
 * for the divider instead.
 */
function BoardHeader({ board, className }: BoardHeaderProps) {
    const { toggleSubscription, authGate } = useBoardSubscription();

    const subscribed = board.subscribed;

    return (
        <header
            data-slot="board-header"
            className={cn('flex flex-col gap-4', className)}
        >
            <div className="flex items-start justify-between gap-3">
                <div
                    data-slot="board-identity"
                    className="flex min-w-0 flex-1 items-start gap-3"
                >
                    <BoardAvatar slug={board.slug} size={44} />

                    <div className="flex min-w-0 flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="font-display text-h2 font-semibold break-words text-foreground">
                                {board.name}
                            </h1>

                            {/* Beside the board's name, where somebody arriving
                                from a link sees it before they scroll into the
                                threads. Named in words rather than signalled by
                                colour. */}
                            {board.nsfw ? (
                                <Badge tone="danger">NSFW</Badge>
                            ) : null}
                        </div>

                        <MachineValue>{board.slug}</MachineValue>
                    </div>
                </div>

                {/* Not restated as `shrink-0` here: `Button`'s base classes
                    already carry it, and a negative control confirmed that
                    removing the restatement changes nothing while removing it
                    from the base breaks the row. Two spellings of one
                    guarantee would have made the guard below unfalsifiable. */}
                <Button
                    type="button"
                    variant={subscribed ? 'outline' : 'primary'}
                    aria-pressed={subscribed}
                    onClick={() => toggleSubscription(board)}
                >
                    {subscribed ? (
                        <Check aria-hidden="true" />
                    ) : (
                        <Plus aria-hidden="true" />
                    )}
                    {subscribed ? 'Joined' : 'Join'}
                </Button>
            </div>

            <div className="flex flex-col gap-1.5">
                <p className="max-w-[52ch] text-body-sm text-pretty break-words text-muted-foreground">
                    {board.description || GENERIC_DESCRIPTION}
                </p>

                <MachineValue>
                    {board.threads}{' '}
                    {board.threads === '1' ? 'thread' : 'threads'}
                </MachineValue>
            </div>

            <hr className="border-border" />

            {authGate}
        </header>
    );
}

export { BoardHeader };
export type { BoardHeaderProps };
