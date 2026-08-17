import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
    Command as CommandRoot,
    CommandEmpty as CommandEmptyPrimitive,
    CommandGroup as CommandGroupPrimitive,
    CommandInput as CommandInputPrimitive,
    CommandItem as CommandItemPrimitive,
    CommandList as CommandListPrimitive,
    CommandSeparator as CommandSeparatorPrimitive,
} from 'cmdk';
import { SearchIcon } from 'lucide-react';
import { useEffect } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import {
    menuSeparatorClassName,
    menuShortcutClassName,
} from '@/components/clover/menu-surface';
import { Dialog, DialogOverlay, DialogPortal } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * The command palette. Unlike the rest of Task 3 this has no counterpart in
 * the design prototype, so it extends the system rather than porting it: the
 * surface, motion and row treatment are all borrowed from the menu and dialog
 * components so it reads as part of the same family.
 *
 * cmdk owns filtering and highlight state; Radix Dialog owns focus trapping
 * and dismissal. Neither is reimplemented here.
 */

/**
 * Opens the palette on the meta-K / control-K chord. Registered on the
 * document because the palette is reachable from anywhere, and guarded on the
 * modifier so a bare `k` still types a letter.
 */
function useCommandPaletteShortcut(onOpen: () => void): void {
    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent): void {
            if (event.key.toLowerCase() !== 'k') {
                return;
            }

            if (!event.metaKey && !event.ctrlKey) {
                return;
            }

            event.preventDefault();
            onOpen();
        }

        document.addEventListener('keydown', handleKeyDown);

        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onOpen]);
}

type CommandPaletteProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Names the dialog for assistive technology. */
    label?: string;
    children: ReactNode;
};

function CommandPalette({
    open,
    onOpenChange,
    label = 'Command palette',
    children,
}: CommandPaletteProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogPortal>
                <DialogOverlay />
                <DialogPrimitive.Content
                    aria-label={label}
                    className={cn(
                        'fixed top-[15%] left-[50%] z-50 w-full max-w-[calc(100%-2rem)] translate-x-[-50%] sm:max-w-xl',
                        'overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-overlay',
                        'data-[state=closed]:animate-out data-[state=closed]:duration-[calc(var(--duration-enter)*0.65)] data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-98',
                        'data-[state=open]:animate-in data-[state=open]:duration-[var(--duration-enter)] data-[state=open]:ease-[var(--ease-out)] data-[state=open]:fade-in-0 data-[state=open]:zoom-in-98',
                    )}
                >
                    {/* Radix requires a title for the accessible name; the
                        palette shows its purpose through the search field
                        instead of a visible heading. */}
                    <DialogPrimitive.Title className="sr-only">
                        {label}
                    </DialogPrimitive.Title>
                    <CommandRoot label={label}>{children}</CommandRoot>
                </DialogPrimitive.Content>
            </DialogPortal>
        </Dialog>
    );
}

function CommandInput({
    className,
    ...props
}: ComponentProps<typeof CommandInputPrimitive>) {
    return (
        <div className="flex items-center gap-2.5 border-b border-border px-4">
            <SearchIcon className="size-4 shrink-0 text-faint" />
            <CommandInputPrimitive
                autoFocus
                className={cn(
                    'h-12 w-full bg-transparent text-base outline-none md:text-body',
                    'placeholder:text-faint disabled:cursor-not-allowed disabled:opacity-60',
                    className,
                )}
                {...props}
            />
            <DialogPrimitive.Close
                className={cn(
                    'shrink-0 rounded-sm px-1.5 py-0.5 text-caption text-faint tabular-nums',
                    'border border-border transition-colors duration-[var(--duration-hover)]',
                    'hover:bg-surface-hover hover:text-foreground',
                )}
            >
                Esc
                <span className="sr-only">Close the command palette</span>
            </DialogPrimitive.Close>
        </div>
    );
}

function CommandList({
    className,
    ...props
}: ComponentProps<typeof CommandListPrimitive>) {
    return (
        <CommandListPrimitive
            className={cn(
                'max-h-80 overflow-x-hidden overflow-y-auto p-1.5',
                className,
            )}
            {...props}
        />
    );
}

/**
 * Empty-state copy is dry and does not pretend to be helpful it cannot be:
 * it reports the fact and stops.
 */
function CommandEmpty({
    className,
    children = 'Nothing matches that search.',
    ...props
}: ComponentProps<typeof CommandEmptyPrimitive>) {
    return (
        <CommandEmptyPrimitive
            className={cn(
                'px-3 py-8 text-center text-body-sm text-muted-foreground',
                className,
            )}
            {...props}
        >
            {children}
        </CommandEmptyPrimitive>
    );
}

type CommandGroupProps = Omit<
    ComponentProps<typeof CommandGroupPrimitive>,
    'heading'
> & {
    heading?: string;
};

function CommandGroup({ heading, className, ...props }: CommandGroupProps) {
    return (
        <CommandGroupPrimitive
            heading={
                heading ? (
                    <span className="text-label tracking-[1.2px] text-faint uppercase">
                        {heading}
                    </span>
                ) : undefined
            }
            className={cn(
                '[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5',
                className,
            )}
            {...props}
        />
    );
}

function CommandSeparator({
    className,
    ...props
}: ComponentProps<typeof CommandSeparatorPrimitive>) {
    return (
        <CommandSeparatorPrimitive
            className={cn(menuSeparatorClassName, className)}
            {...props}
        />
    );
}

type CommandItemProps = ComponentProps<typeof CommandItemPrimitive> & {
    /** Leading glyph. Lucide icons only, never emoji. */
    icon?: ReactNode;
    /** Right-aligned keyboard hint. */
    shortcut?: string;
};

function CommandItem({
    className,
    children,
    icon,
    shortcut,
    keywords,
    ...props
}: CommandItemProps) {
    return (
        <CommandItemPrimitive
            // cmdk matches on `value`, which here is a stable id like `/wg/`.
            // Without this the visible label would not be searchable at all.
            keywords={[
                ...(keywords ?? []),
                ...(typeof children === 'string' ? [children] : []),
            ]}
            className={cn(
                /* Same treatment as `menu-surface`'s rows, for the same
                   reason: a stacked list grows on coarse pointers rather
                   than hanging overlapping hit areas into its neighbours. */
                'flex h-8 cursor-default items-center gap-2.5 rounded-md px-2 text-body-sm pointer-coarse:h-11',
                'transition-colors duration-[var(--duration-hover)] ease-[var(--ease-standard)]',
                'data-[selected=true]:bg-surface-hover data-[selected=true]:text-foreground',
                'data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-60',
                "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
                className,
            )}
            {...props}
        >
            {icon}
            <span className="truncate">{children}</span>
            {shortcut ? (
                <span className={menuShortcutClassName}>{shortcut}</span>
            ) : null}
        </CommandItemPrimitive>
    );
}

export {
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandPalette,
    CommandSeparator,
    useCommandPaletteShortcut,
};
export type { CommandGroupProps, CommandItemProps, CommandPaletteProps };
