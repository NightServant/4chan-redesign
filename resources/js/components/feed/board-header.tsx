import { Check, Plus } from 'lucide-react';
import { useState } from 'react';
import { BoardAvatar } from '@/components/clover/board-avatar';
import { MachineValue } from '@/components/clover/machine-value';
import { Button } from '@/components/ui/button';
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
 * The board's identity strip above its thread list: avatar, name, a
 * `MachineValue` of slug and thread count, one description line, and a
 * Subscribe toggle.
 *
 * The `MachineValue` used to read `/g/ · 41,208 online`. It does not any more,
 * and not because the layout changed: 4chan's JSON API publishes no online
 * count at any scope, so that number could only ever have been invented on
 * every render. Thread count replaces it because the API genuinely reports it
 * and the copy beside it says exactly what it counts. A stat whose label does
 * not describe the number under it is the same lie in a smaller font.
 *
 * Deliberately not a `Panel` or `Card`: the thread list underneath is
 * already a stack of cards, and wrapping this in one too would read as a
 * second card stacked on the first, which the taste laws rule out. A plain
 * `hr` stands in for the divider instead.
 */
function BoardHeader({ board, className }: BoardHeaderProps) {
    const [subscribed, setSubscribed] = useState(false);

    return (
        <header
            data-slot="board-header"
            className={cn('flex flex-col gap-5', className)}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <BoardAvatar slug={board.slug} size={44} />
                    <div className="flex flex-col gap-1.5">
                        <h1 className="font-display text-h2 font-semibold text-foreground">
                            {board.name}
                        </h1>
                        <MachineValue>
                            {board.slug} · {board.threads}{' '}
                            {board.threads === '1' ? 'thread' : 'threads'}
                        </MachineValue>
                        <p className="max-w-[52ch] text-body-sm text-pretty text-muted-foreground">
                            {board.description || GENERIC_DESCRIPTION}
                        </p>
                    </div>
                </div>

                <Button
                    type="button"
                    variant={subscribed ? 'outline' : 'primary'}
                    aria-pressed={subscribed}
                    onClick={() => setSubscribed((value) => !value)}
                >
                    {subscribed ? (
                        <Check aria-hidden="true" />
                    ) : (
                        <Plus aria-hidden="true" />
                    )}
                    {subscribed ? 'Subscribed' : 'Subscribe'}
                </Button>
            </div>

            <hr className="border-border" />
        </header>
    );
}

export { BoardHeader };
export type { BoardHeaderProps };
