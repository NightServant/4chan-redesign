import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/**
 * The identity mark for an anonymous poster.
 *
 * An anon has no name and no picture, so the mark derived from their seed is
 * the only identity they carry. It must therefore be stable: the same seed
 * always produces the same mark, computed locally with no randomness and no
 * third-party avatar service.
 *
 * The OP spends the single gradient Clover permits anywhere in the product.
 * Every other anon is flat.
 */
const anonAvatarVariants = cva(
    'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-transparent select-none',
    {
        variants: {
            variant: {
                anon: 'border-border bg-surface-elevated text-muted-foreground',
                op: 'bg-linear-to-br from-primary to-teal-500 text-primary-foreground',
            },
        },
        defaultVariants: {
            variant: 'anon',
        },
    },
);

/** Grid is 5 columns wide, mirrored around the centre column. */
const GRID = 5;
const HALF = 3;
const CELLS = GRID * HALF;
/** Centre column, used to guarantee a legible mark for sparse seeds. */
const FALLBACK_CELLS = [1, 7, 13];
const MINIMUM_FILLED = 4;

/** FNV-1a, 32-bit. Small, stable, and dependency free. */
function hashSeed(seed: string): number {
    let hash = 0x811c9dc5;

    for (let index = 0; index < seed.length; index += 1) {
        hash ^= seed.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
    }

    return hash >>> 0;
}

/**
 * Expand the seed hash into the left half of the grid. The top bit of a linear
 * congruential step is the well-distributed one, so each cell reads that.
 */
function cellsFor(seed: string): boolean[] {
    const cells: boolean[] = [];
    let state = hashSeed(seed);

    for (let index = 0; index < CELLS; index += 1) {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        cells.push(state >>> 31 === 1);
    }

    if (cells.filter(Boolean).length < MINIMUM_FILLED) {
        for (const index of FALLBACK_CELLS) {
            cells[index] = true;
        }
    }

    return cells;
}

type MarkCell = { key: string; x: number; y: number };

function markFor(seed: string): MarkCell[] {
    const cells = cellsFor(seed);
    const marks: MarkCell[] = [];

    for (let row = 0; row < GRID; row += 1) {
        for (let column = 0; column < HALF; column += 1) {
            if (!cells[row * HALF + column]) {
                continue;
            }

            marks.push({ key: `${row}-${column}`, x: column, y: row });

            if (column < HALF - 1) {
                marks.push({
                    key: `${row}-${GRID - 1 - column}`,
                    x: GRID - 1 - column,
                    y: row,
                });
            }
        }
    }

    return marks;
}

export interface AnonAvatarProps
    extends
        Omit<ComponentProps<'span'>, 'children'>,
        VariantProps<typeof anonAvatarVariants> {
    /** Stable identity input, e.g. `you` or a post number. */
    seed: string;
    /** Edge length in px. */
    size?: number;
    /**
     * Accessible name. Omit when the post number or author line already names
     * the anon in adjacent text, which is the usual case: the mark is then
     * decorative and carries nothing a screen reader can use.
     */
    label?: string;
}

export function AnonAvatar({
    seed,
    size = 32,
    variant,
    label,
    className,
    style,
    ...props
}: AnonAvatarProps) {
    const marks = markFor(seed);

    return (
        <span
            data-slot="anon-avatar"
            role={label ? 'img' : undefined}
            aria-label={label}
            aria-hidden={label ? undefined : true}
            style={{ width: size, height: size, ...style }}
            className={cn(anonAvatarVariants({ variant }), className)}
            {...props}
        >
            <svg
                aria-hidden="true"
                focusable="false"
                viewBox="0 0 7 7"
                className="h-full w-full"
                fill="currentColor"
            >
                {marks.map((mark) => (
                    <rect
                        key={mark.key}
                        x={mark.x + 1}
                        y={mark.y + 1}
                        width={1}
                        height={1}
                        rx={0.25}
                    />
                ))}
            </svg>
        </span>
    );
}

export { anonAvatarVariants };
