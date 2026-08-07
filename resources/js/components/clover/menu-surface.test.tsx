import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
    MenuItem,
    MenuLabel,
    MenuSeparator,
    MenuSurface,
} from '@/components/clover/menu-surface';

describe('MenuSurface', () => {
    it('renders an elevated floating surface', () => {
        render(
            <MenuSurface>
                <MenuItem label="Save" />
            </MenuSurface>,
        );

        const surface = document.querySelector('[data-slot="menu-surface"]');

        expect(surface).toBeInTheDocument();
        expect(surface).toHaveClass(
            'bg-surface-elevated',
            'rounded-lg',
            'border-border',
            'shadow-overlay',
        );
    });

    it('defaults to a 220px minimum width', () => {
        render(
            <MenuSurface>
                <MenuItem label="Save" />
            </MenuSurface>,
        );

        const surface = document.querySelector(
            '[data-slot="menu-surface"]',
        ) as HTMLElement;

        expect(surface.style.minWidth).toBe('220px');
    });

    it('overrides the minimum width through the width prop', () => {
        render(
            <MenuSurface width={320}>
                <MenuItem label="Save" />
            </MenuSurface>,
        );

        const surface = document.querySelector(
            '[data-slot="menu-surface"]',
        ) as HTMLElement;

        expect(surface.style.minWidth).toBe('320px');
    });
});

describe('MenuItem', () => {
    it('renders its icon, label and right-aligned shortcut', () => {
        render(
            <MenuItem
                icon={<span data-testid="icon">*</span>}
                label="Save"
                shortcut="S"
            />,
        );

        const item = screen.getByRole('menuitem', { name: /save/i });

        expect(item).toBeInTheDocument();
        expect(screen.getByTestId('icon')).toBeInTheDocument();

        const shortcut = screen.getByText('S');

        expect(shortcut).toHaveClass(
            'text-caption',
            'text-faint',
            'tabular-nums',
        );
        expect(shortcut.className).not.toContain('font-mono');
    });

    it('calls onSelect when clicked', async () => {
        const onSelect = vi.fn();

        render(<MenuItem label="Save" onSelect={onSelect} />);

        await userEvent.click(screen.getByRole('menuitem', { name: 'Save' }));

        expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('calls onSelect when activated with the keyboard', async () => {
        const onSelect = vi.fn();

        render(<MenuItem label="Save" onSelect={onSelect} />);

        const item = screen.getByRole('menuitem', { name: 'Save' });
        item.focus();
        await userEvent.keyboard('{Enter}');

        expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('marks a danger item distinguishably beyond colour alone', () => {
        render(<MenuItem label="Report" danger />);

        const item = screen.getByRole('menuitem', { name: 'Report' });

        expect(item).toHaveClass('text-danger');
        expect(item).toHaveClass('font-semibold');
    });

    it('disables an item with aria-disabled and reduced opacity, not pointer-events alone', async () => {
        const onSelect = vi.fn();

        render(<MenuItem label="Delete" disabled onSelect={onSelect} />);

        const item = screen.getByRole('menuitem', { name: 'Delete' });

        expect(item).toHaveAttribute('aria-disabled', 'true');
        expect(item.className).toMatch(/aria-disabled:opacity-60/);

        await userEvent.click(item);
        expect(onSelect).not.toHaveBeenCalled();

        item.focus();
        await userEvent.keyboard('{Enter}');
        expect(onSelect).not.toHaveBeenCalled();
    });
});

describe('MenuLabel', () => {
    it('renders as a tracked uppercase section label', () => {
        render(<MenuLabel>Thread</MenuLabel>);

        const label = screen.getByText('Thread');

        expect(label).toHaveClass('text-label', 'uppercase');
    });
});

describe('MenuSeparator', () => {
    it('renders a hairline separator', () => {
        render(<MenuSeparator />);

        expect(screen.getByRole('separator')).toBeInTheDocument();
    });
});
