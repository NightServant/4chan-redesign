import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuLabel,
    ContextMenuSeparator,
    ContextMenuShortcut,
    ContextMenuTrigger,
} from '@/components/ui/context-menu';

/**
 * Radix's menu drives its listbox with pointer capture and scroll APIs that
 * jsdom does not implement. Stub them so the menu can actually open, matching
 * the pattern already used by select.test.tsx.
 */
beforeAll(() => {
    Element.prototype.hasPointerCapture = () => false;
    Element.prototype.setPointerCapture = () => {};
    Element.prototype.releasePointerCapture = () => {};
    Element.prototype.scrollIntoView = () => {};
});

function renderMenu({
    onSave = vi.fn(),
    onCopy = vi.fn(),
    onReport = vi.fn(),
    onArchive = vi.fn(),
} = {}) {
    render(
        <ContextMenu>
            <ContextMenuTrigger>Thread post</ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuLabel>Thread</ContextMenuLabel>
                <ContextMenuSeparator />
                <ContextMenuItem onSelect={onSave}>
                    Save
                    <ContextMenuShortcut>S</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem onSelect={onCopy}>Copy link</ContextMenuItem>
                <ContextMenuItem disabled onSelect={onArchive}>
                    Archive
                </ContextMenuItem>
                <ContextMenuItem variant="destructive" onSelect={onReport}>
                    Report
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>,
    );

    return { onSave, onCopy, onReport, onArchive };
}

describe('ContextMenu', () => {
    it('opens the elevated menu surface on right-click', async () => {
        renderMenu();

        await userEvent.pointer({
            keys: '[MouseRight]',
            target: screen.getByText('Thread post'),
        });

        const content = document.querySelector(
            '[data-slot="context-menu-content"]',
        );

        expect(screen.getByRole('menu')).toBeInTheDocument();
        expect(content).toHaveClass(
            'bg-surface-elevated',
            'rounded-lg',
            'border-border',
            'shadow-overlay',
        );
    });

    it('navigates items with the arrow keys and selects the focused item with Enter', async () => {
        const { onCopy, onSave } = renderMenu();

        await userEvent.pointer({
            keys: '[MouseRight]',
            target: screen.getByText('Thread post'),
        });
        await screen.findByRole('menu');

        await userEvent.keyboard('{ArrowDown}');
        await userEvent.keyboard('{ArrowDown}');
        await userEvent.keyboard('{Enter}');

        expect(onCopy).toHaveBeenCalledTimes(1);
        expect(onSave).not.toHaveBeenCalled();
    });

    it('closes the menu on Escape', async () => {
        renderMenu();

        await userEvent.pointer({
            keys: '[MouseRight]',
            target: screen.getByText('Thread post'),
        });
        await screen.findByRole('menu');

        await userEvent.keyboard('{Escape}');

        await waitFor(() => {
            expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        });
    });

    it('does not activate a disabled item by click or keyboard', async () => {
        const { onArchive } = renderMenu();

        await userEvent.pointer({
            keys: '[MouseRight]',
            target: screen.getByText('Thread post'),
        });

        const archiveItem = await screen.findByRole('menuitem', {
            name: 'Archive',
        });

        expect(archiveItem).toHaveAttribute('data-disabled');

        await userEvent.click(archiveItem);
        expect(onArchive).not.toHaveBeenCalled();
    });

    it('marks the destructive variant distinguishably beyond colour', async () => {
        renderMenu();

        await userEvent.pointer({
            keys: '[MouseRight]',
            target: screen.getByText('Thread post'),
        });

        const reportItem = await screen.findByRole('menuitem', {
            name: 'Report',
        });

        expect(reportItem).toHaveClass('text-danger');
        expect(reportItem).toHaveClass('font-semibold');
    });

    it('renders the shortcut with the token type scale and no mono font', async () => {
        renderMenu();

        await userEvent.pointer({
            keys: '[MouseRight]',
            target: screen.getByText('Thread post'),
        });

        const shortcut = await screen.findByText('S');

        expect(shortcut).toHaveClass('text-caption', 'text-faint');
        expect(shortcut.className).not.toContain('font-mono');
    });
});
