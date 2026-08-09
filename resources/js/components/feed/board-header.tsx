import { Check, Plus } from 'lucide-react';
import { useState } from 'react';
import { BoardAvatar } from '@/components/clover/board-avatar';
import { MachineValue } from '@/components/clover/machine-value';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Board } from '@/types/clover';

type BoardHeaderProps = {
    board: Board;
    className?: string;
};

/**
 * The board's identity strip above its thread list: avatar, name, a
 * `MachineValue` of slug and online count, one description line, and a
 * Subscribe toggle.
 *
 * The fixtures carry no per-board description, and inventing six lines of
 * flavour text for boards like `/x/` and `/biz/` would be fabricating
 * product copy. The line here is instead one fact true of every board on
 * the product (threads are anonymous and bump on reply), not a summary of
 * this board's topic.
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
                            {board.slug} · {board.online} online
                        </MachineValue>
                        <p className="max-w-[52ch] text-body-sm text-pretty text-muted-foreground">
                            Anonymous threads, bumped by reply.
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
