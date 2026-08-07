import { cva } from 'class-variance-authority';
import { Hash } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/**
 * Board identity chip.
 *
 * Every board owns a fixed swatch that does not move between themes, because
 * the colour is part of the board's identity rather than a surface. Boards
 * without a swatch fall back to a neutral chip so an unknown slug degrades
 * instead of breaking.
 */
const boardAvatarVariants = cva(
    'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-transparent leading-none font-semibold select-none',
    {
        variants: {
            board: {
                '3': 'bg-board-3 text-board-3-fg',
                a: 'bg-board-a text-board-a-fg',
                b: 'bg-board-b text-board-b-fg',
                int: 'bg-board-int text-board-int-fg',
                biz: 'bg-board-biz text-board-biz-fg',
                vm: 'bg-board-vm text-board-vm-fg',
                g: 'bg-board-g text-board-g-fg',
                wg: 'bg-board-wg text-board-wg-fg',
                fit: 'bg-board-fit text-board-fit-fg',
                x: 'bg-board-x text-board-x-fg',
                co: 'bg-board-co text-board-co-fg',
                none: 'border-border bg-surface-elevated text-muted-foreground',
            },
        },
        defaultVariants: {
            board: 'none',
        },
    },
);

const BOARD_TOKENS = [
    '3',
    'a',
    'b',
    'int',
    'biz',
    'vm',
    'g',
    'wg',
    'fit',
    'x',
    'co',
] as const;

type BoardToken = (typeof BOARD_TOKENS)[number];

/** `  /BIZ/ ` becomes `biz`; `//` and `` become an empty token. */
function normaliseSlug(slug: string): string {
    return slug.trim().replace(/\//g, '').trim().toLowerCase();
}

function hasSwatch(token: string): token is BoardToken {
    return (BOARD_TOKENS as readonly string[]).includes(token);
}

/**
 * Longer tokens get proportionally smaller figures so `/biz/` stays inside the
 * same square as `/g/`. At the default 34px size a two-glyph token lands on the
 * 12px caption step.
 */
function figureSizeFor(token: string, size: number): number {
    if (token.length <= 1) {
        return Math.round(size * 0.42);
    }

    if (token.length === 2) {
        return Math.round(size * 0.36);
    }

    if (token.length === 3) {
        return Math.round(size * 0.3);
    }

    return Math.round(size * 0.24);
}

export interface BoardAvatarProps extends Omit<
    ComponentProps<'span'>,
    'children'
> {
    /** Board slug in product form, e.g. `/g/`. Slashes are optional. */
    slug: string;
    /** Edge length in px. */
    size?: number;
    /**
     * Hide the chip from assistive tech. Use when the board is already named in
     * adjacent text, so the slug is not announced twice.
     */
    decorative?: boolean;
}

export function BoardAvatar({
    slug,
    size = 34,
    decorative = false,
    className,
    style,
    ...props
}: BoardAvatarProps) {
    const token = normaliseSlug(slug);
    const board = hasSwatch(token) ? token : 'none';
    const label = token ? `${token} board` : 'Unknown board';

    return (
        <span
            data-slot="board-avatar"
            data-board={token || undefined}
            role={decorative ? undefined : 'img'}
            aria-label={decorative ? undefined : label}
            aria-hidden={decorative || undefined}
            style={{ width: size, height: size, ...style }}
            className={cn(boardAvatarVariants({ board }), className)}
            {...props}
        >
            {token ? (
                <span
                    aria-hidden="true"
                    className="tabular-nums"
                    style={{ fontSize: figureSizeFor(token, size) }}
                >
                    {token}
                </span>
            ) : (
                <Hash aria-hidden="true" size={Math.round(size * 0.44)} />
            )}
        </span>
    );
}

export { boardAvatarVariants };
