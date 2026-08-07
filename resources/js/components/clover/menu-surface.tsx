import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import type {
    ComponentProps,
    KeyboardEventHandler,
    MouseEventHandler,
    ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

/**
 * The Clover menu look: a floating surface plus item rows. These are
 * presentational only, no Radix and no state, so `DropdownMenu` and
 * `ContextMenu` can each drive real behaviour around the same appearance
 * instead of the two drifting apart. The class strings below are exported so
 * both Radix-backed menus reuse them rather than duplicating them.
 */

const menuSurfaceClassName =
    'z-50 min-w-[220px] overflow-hidden rounded-lg border border-border bg-surface-elevated p-1.5 text-foreground shadow-overlay';

const menuLabelClassName =
    'px-2 py-1.5 text-label tracking-[1.2px] text-faint uppercase';

const menuSeparatorClassName = 'my-1.5 h-px bg-border';

const menuShortcutClassName = 'ml-auto text-caption text-faint tabular-nums';

/**
 * The enter/exit motion shared by every Radix-driven Clover menu (Dropdown
 * and ContextMenu). Transform and opacity only, honouring `data-state` and
 * `data-side` so the panel arrives from the direction it opened toward. Exit
 * runs at roughly 65% of the enter duration per the "exits are shorter"
 * motion law, both still derived from `--duration-overlay`.
 */
const menuContentAnimationClassName = [
    'transition-[opacity,transform] duration-[var(--duration-overlay)] ease-[var(--ease-out)]',
    'data-[state=closed]:duration-[calc(var(--duration-overlay)*0.65)]',
    'data-[state=closed]:opacity-0 data-[state=open]:opacity-100',
    'data-[side=bottom]:data-[state=closed]:-translate-y-1 data-[side=top]:data-[state=closed]:translate-y-1',
    'data-[side=left]:data-[state=closed]:translate-x-1 data-[side=right]:data-[state=closed]:-translate-x-1',
    'data-[state=open]:translate-x-0 data-[state=open]:translate-y-0',
].join(' ');

/**
 * `hover` covers a real pointer, `focus` covers Radix's roving tabindex, and
 * `data-[highlighted]` covers Radix's own highlight state, so the same class
 * string works whether an item is driven by Radix or rendered standalone.
 */
const menuItemVariants = cva(
    [
        'relative flex h-8 w-full cursor-default items-center gap-2.5 rounded-md px-2 text-body-sm text-foreground outline-hidden select-none',
        'transition-colors duration-[var(--duration-hover)] ease-[var(--ease-standard)]',
        'hover:bg-surface-hover focus:bg-surface-hover data-[highlighted]:bg-surface-hover',
        'aria-disabled:pointer-events-none aria-disabled:opacity-60 data-[disabled]:pointer-events-none data-[disabled]:opacity-60',
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5 [&_svg:not([class*='text-'])]:text-faint",
    ],
    {
        variants: {
            /**
             * Danger is never colour alone: the label also picks up extra
             * weight so it reads without relying on hue perception.
             */
            danger: {
                true: "font-semibold text-danger hover:bg-danger-soft focus:bg-danger-soft data-[highlighted]:bg-danger-soft [&_svg:not([class*='text-'])]:text-danger",
                false: '',
            },
        },
        defaultVariants: {
            danger: false,
        },
    },
);

function getMenuItemClassName(
    props: VariantProps<typeof menuItemVariants> & { className?: string },
) {
    const { className, ...variants } = props;

    return cn(menuItemVariants(variants), className);
}

export {
    menuSurfaceClassName,
    menuLabelClassName,
    menuSeparatorClassName,
    menuShortcutClassName,
    menuContentAnimationClassName,
    menuItemVariants,
    getMenuItemClassName,
};

type MenuSurfaceProps = ComponentProps<'div'> & {
    /** Overrides the default 220px minimum width. */
    width?: number;
};

function MenuSurface({
    className,
    style,
    width = 220,
    ...props
}: MenuSurfaceProps) {
    return (
        <div
            data-slot="menu-surface"
            className={cn(menuSurfaceClassName, className)}
            style={{ minWidth: `${width}px`, ...style }}
            {...props}
        />
    );
}

type MenuLabelProps = ComponentProps<'div'>;

function MenuLabel({ className, ...props }: MenuLabelProps) {
    return (
        <div
            data-slot="menu-label"
            className={cn(menuLabelClassName, className)}
            {...props}
        />
    );
}

type MenuSeparatorProps = ComponentProps<'div'>;

function MenuSeparator({ className, ...props }: MenuSeparatorProps) {
    return (
        <div
            role="separator"
            data-slot="menu-separator"
            className={cn(menuSeparatorClassName, className)}
            {...props}
        />
    );
}

type MenuItemProps = Omit<ComponentProps<'div'>, 'onSelect'> & {
    icon?: ReactNode;
    label: ReactNode;
    shortcut?: ReactNode;
    /** Marks a destructive action. Never colour alone, see the variant above. */
    danger?: boolean;
    disabled?: boolean;
    /** Fires on click or Enter/Space, matching Radix's menu item contract. */
    onSelect?: () => void;
};

function MenuItem({
    icon,
    label,
    shortcut,
    danger = false,
    disabled = false,
    onSelect,
    onClick,
    onKeyDown,
    className,
    ...props
}: MenuItemProps) {
    const handleClick: MouseEventHandler<HTMLDivElement> = (event) => {
        if (disabled) {
            return;
        }

        onSelect?.();
        onClick?.(event);
    };

    const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (event) => {
        onKeyDown?.(event);

        if (disabled) {
            return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect?.();
        }
    };

    return (
        <div
            role="menuitem"
            data-slot="menu-item"
            aria-disabled={disabled || undefined}
            tabIndex={disabled ? -1 : 0}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            className={getMenuItemClassName({ danger, className })}
            {...props}
        >
            {icon}
            <span className="flex-1 truncate text-left">{label}</span>
            {shortcut ? (
                <span className={menuShortcutClassName}>{shortcut}</span>
            ) : null}
        </div>
    );
}

export { MenuSurface, MenuLabel, MenuSeparator, MenuItem };
export type {
    MenuSurfaceProps,
    MenuLabelProps,
    MenuSeparatorProps,
    MenuItemProps,
};
