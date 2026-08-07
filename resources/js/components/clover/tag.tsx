import type { MouseEventHandler, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * A subject chip: trending topics, thread subjects, board filters. Quieter and
 * squarer than `Badge`, which reports status. A tag becomes a button only when
 * it actually does something.
 *
 * tailwind-merge (inside `cn`) does not know Clover's type scale, so it reads
 * `text-caption` as a text colour and drops it next to `text-muted-foreground`.
 * Applying the scale outside the merge keeps both.
 */

const typeScale = 'text-caption font-medium';

const baseClasses =
    'inline-flex w-fit shrink-0 items-center gap-1 whitespace-nowrap rounded-sm px-2 py-0.5';

const selectedClasses = 'bg-primary-soft text-accent-text';

const restingClasses = 'bg-surface-elevated text-muted-foreground';

const interactiveClasses =
    'transition-colors duration-150 ease-standard hover:not-disabled:bg-surface-hover hover:not-disabled:text-foreground disabled:cursor-not-allowed disabled:opacity-60';

type TagProps = {
    children: ReactNode;
    className?: string;
    /** Tint the tag and, when interactive, report `aria-pressed`. */
    selected?: boolean;
    /** Supplying a handler turns the tag into a button. */
    onClick?: MouseEventHandler<HTMLButtonElement>;
    /** Only meaningful on an interactive tag. */
    disabled?: boolean;
};

function Tag({
    children,
    className,
    selected = false,
    onClick,
    disabled = false,
}: TagProps) {
    const tone = selected ? selectedClasses : restingClasses;

    if (onClick) {
        return (
            <button
                type="button"
                data-slot="tag"
                aria-pressed={selected}
                disabled={disabled}
                onClick={onClick}
                className={`${typeScale} ${cn(
                    baseClasses,
                    tone,
                    interactiveClasses,
                    className,
                )}`}
            >
                {children}
            </button>
        );
    }

    return (
        <span
            data-slot="tag"
            className={`${typeScale} ${cn(baseClasses, tone, className)}`}
        >
            {children}
        </span>
    );
}

export { Tag };
export type { TagProps };
