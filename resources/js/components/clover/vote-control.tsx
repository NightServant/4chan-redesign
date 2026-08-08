import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import { ArrowBigDown, ArrowBigUp } from 'lucide-react';
import type { ComponentProps } from 'react';
import { MachineValue } from '@/components/clover/machine-value';
import { cn } from '@/lib/utils';

/**
 * The blessings-and-curses control. Two independently focusable buttons with
 * a count between them.
 *
 * State never rides on colour alone: the active side also swaps to a filled
 * icon, so it survives without colour vision. The tint stays on the icon and
 * label, never a large fill, so a feed of posts never turns into a traffic
 * light.
 */
const voteButtonVariants = cva(
    [
        'inline-flex shrink-0 items-center justify-center rounded-md text-muted-foreground',
        'transition-colors duration-[var(--duration-hover)] ease-standard',
        'hover:bg-surface-hover active:scale-[0.98]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    ],
    {
        variants: {
            size: {
                sm: "size-7 [&_svg:not([class*='size-'])]:size-3.5",
                md: "size-8.5 [&_svg:not([class*='size-'])]:size-4",
            },
        },
        defaultVariants: {
            size: 'md',
        },
    },
);

type VoteState = 'blessed' | 'cursed' | null;

type VoteControlProps = Omit<ComponentProps<'div'>, 'children'> &
    VariantProps<typeof voteButtonVariants> & {
        count: number;
        state?: VoteState;
        onBless?: () => void;
        onCurse?: () => void;
    };

function VoteControl({
    count,
    state = null,
    onBless,
    onCurse,
    size = 'md',
    className,
    ...props
}: VoteControlProps) {
    const blessed = state === 'blessed';
    const cursed = state === 'cursed';

    return (
        <div
            data-slot="vote-control"
            className={cn('flex items-center gap-1.5', className)}
            {...props}
        >
            <button
                type="button"
                aria-pressed={blessed}
                aria-label="Bless this post"
                onClick={onBless}
                className={cn(
                    voteButtonVariants({ size }),
                    blessed && 'text-primary',
                )}
            >
                <ArrowBigUp className={cn(blessed && 'fill-current')} />
            </button>
            <MachineValue className="min-w-[3ch] text-center">
                {count}
            </MachineValue>
            <button
                type="button"
                aria-pressed={cursed}
                aria-label="Curse this post"
                onClick={onCurse}
                className={cn(
                    voteButtonVariants({ size }),
                    cursed && 'text-danger',
                )}
            >
                <ArrowBigDown className={cn(cursed && 'fill-current')} />
            </button>
        </div>
    );
}

export { VoteControl };
export type { VoteControlProps, VoteState };
