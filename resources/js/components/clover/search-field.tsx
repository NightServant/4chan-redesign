import { Search } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export interface SearchFieldProps extends Omit<
    ComponentProps<'button'>,
    'children' | 'type'
> {
    /**
     * Prompt shown in place of a value. Doubles as the button's accessible
     * name, so it should read as the thing the palette searches.
     */
    placeholder?: string;
}

/**
 * Header search affordance.
 *
 * It looks like a field but behaves as a button: activating it opens the
 * command palette rather than accepting keystrokes in place. That keeps one
 * search surface instead of two, and it stays a native button so Tab reaches
 * it and Enter or Space opens it.
 *
 * The shortcut hint is typography, not an icon. There is no mono family, so
 * it sits on `tabular-nums`. It is hidden from assistive tech because
 * `aria-keyshortcuts` already carries the same information.
 */
export function SearchField({
    placeholder = 'Search boards and threads',
    className,
    ...props
}: SearchFieldProps) {
    return (
        <button
            type="button"
            data-slot="search-field"
            aria-keyshortcuts="Meta+K"
            className={cn(
                'flex h-9.5 w-full items-center gap-2 rounded-md border border-border bg-surface px-3 text-left',
                'transition-[color,border-color,background-color] duration-150 ease-out',
                'hover:border-border-strong hover:bg-surface-hover',
                'focus-visible:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border disabled:hover:bg-surface',
                className,
            )}
            {...props}
        >
            <Search aria-hidden="true" className="size-4 shrink-0 text-faint" />
            <span className="flex-1 truncate text-body-sm text-muted-foreground">
                {placeholder}
            </span>
            <span
                aria-hidden="true"
                className="shrink-0 rounded-sm border border-border px-1.5 py-0.5 text-caption text-faint tabular-nums"
            >
                ⌘K
            </span>
        </button>
    );
}
