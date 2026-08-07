import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandPalette,
    useCommandPaletteShortcut,
} from '@/components/clover/command-palette';

function Palette({
    open = true,
    onSelect = () => {},
}: {
    open?: boolean;
    onSelect?: (value: string) => void;
}) {
    return (
        <CommandPalette open={open} onOpenChange={() => {}}>
            <CommandInput placeholder="Search boards and threads" />
            <CommandList>
                <CommandEmpty />
                <CommandGroup heading="Boards">
                    <CommandItem value="/g/" onSelect={onSelect} shortcut="G">
                        Technology
                    </CommandItem>
                    <CommandItem value="/wg/" onSelect={onSelect}>
                        Wallpapers
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandPalette>
    );
}

describe('CommandPalette', () => {
    it('exposes the palette as a dialog with an accessible name', () => {
        render(<Palette />);

        expect(
            screen.getByRole('dialog', { name: /command palette/i }),
        ).toBeInTheDocument();
    });

    it('renders nothing when closed', () => {
        render(<Palette open={false} />);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('puts keyboard focus in the search input on open', () => {
        render(<Palette />);

        expect(
            screen.getByPlaceholderText('Search boards and threads'),
        ).toHaveFocus();
    });

    it('narrows the list to items matching what was typed', async () => {
        const user = userEvent.setup();
        render(<Palette />);

        await user.keyboard('wall');

        expect(screen.getByText('Wallpapers')).toBeInTheDocument();
        expect(screen.queryByText('Technology')).not.toBeInTheDocument();
    });

    it('states plainly that nothing matched, without inventing a suggestion', async () => {
        const user = userEvent.setup();
        render(<Palette />);

        await user.keyboard('zzzz');

        // Dry and specific, per the Clover copy rules: no cheerful apology,
        // no exclamation, and no em dash.
        const empty = screen.getByText('Nothing matches that search.');
        expect(empty).toBeInTheDocument();
        expect(empty.textContent).not.toMatch(/[—–]|--/);
    });

    it('selects the highlighted item when Enter is pressed', async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();
        render(<Palette onSelect={onSelect} />);

        await user.keyboard('wall');
        await user.keyboard('{Enter}');

        expect(onSelect).toHaveBeenCalledWith('/wg/');
    });

    it('moves the highlight with the arrow keys', async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();
        render(<Palette onSelect={onSelect} />);

        await user.keyboard('{ArrowDown}');
        await user.keyboard('{Enter}');

        expect(onSelect).toHaveBeenCalledWith('/wg/');
    });

    it('labels each group with a tracked uppercase heading', () => {
        render(<Palette />);

        expect(screen.getByText('Boards')).toHaveClass('text-label');
    });

    it('renders an item shortcut in tabular figures so the column holds still', () => {
        render(<Palette />);

        expect(screen.getByText('G')).toHaveClass('tabular-nums');
    });
});

describe('useCommandPaletteShortcut', () => {
    function Harness({ onOpen }: { onOpen: () => void }) {
        useCommandPaletteShortcut(onOpen);

        return <input aria-label="Reply" />;
    }

    it('opens the palette on the meta-K chord', async () => {
        const user = userEvent.setup();
        const onOpen = vi.fn();
        render(<Harness onOpen={onOpen} />);

        await user.keyboard('{Meta>}k{/Meta}');

        expect(onOpen).toHaveBeenCalledTimes(1);
    });

    it('opens the palette on the control-K chord for non-Mac keyboards', async () => {
        const user = userEvent.setup();
        const onOpen = vi.fn();
        render(<Harness onOpen={onOpen} />);

        await user.keyboard('{Control>}k{/Control}');

        expect(onOpen).toHaveBeenCalledTimes(1);
    });

    it('ignores a bare k so anons can type the letter', async () => {
        const user = userEvent.setup();
        const onOpen = vi.fn();
        render(<Harness onOpen={onOpen} />);

        await user.keyboard('k');

        expect(onOpen).not.toHaveBeenCalled();
    });
});
