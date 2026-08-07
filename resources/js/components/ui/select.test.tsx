import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

/**
 * Radix Select drives its listbox with pointer capture and scroll APIs that
 * jsdom does not implement. Stub them so the component can actually open.
 */
beforeAll(() => {
    Element.prototype.hasPointerCapture = () => false;
    Element.prototype.setPointerCapture = () => {};
    Element.prototype.releasePointerCapture = () => {};
    Element.prototype.scrollIntoView = () => {};
});

function renderSelect(props: { defaultOpen?: boolean } = {}) {
    return render(
        <Select defaultOpen={props.defaultOpen}>
            <SelectTrigger aria-label="Board">
                <SelectValue placeholder="Pick a board" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="g">Technology</SelectItem>
                <SelectItem value="wg">Wallpapers</SelectItem>
            </SelectContent>
        </Select>,
    );
}

describe('Select', () => {
    it('renders a combobox trigger showing the placeholder', () => {
        renderSelect();

        const trigger = screen.getByRole('combobox', { name: 'Board' });

        expect(trigger).toBeInTheDocument();
        expect(trigger).toHaveTextContent('Pick a board');
    });

    it('gives the trigger the same metrics as Input', () => {
        renderSelect();

        const trigger = screen.getByRole('combobox', { name: 'Board' });

        expect(trigger).toHaveClass(
            'data-[size=default]:h-9.5',
            'rounded-md',
            'border-border',
            'bg-surface',
        );
    });

    it('keeps a visible focus ring and never removes the outline', () => {
        renderSelect();

        const trigger = screen.getByRole('combobox', { name: 'Board' });

        expect(trigger).toHaveClass(
            'focus-visible:outline-2',
            'focus-visible:outline-offset-2',
            'focus-visible:outline-ring',
        );
        expect(trigger.className).not.toContain('outline-none');
    });

    it('marks the invalid state with the danger token', () => {
        render(
            <Select>
                <SelectTrigger aria-label="Board" aria-invalid>
                    <SelectValue placeholder="Pick a board" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="g">Technology</SelectItem>
                </SelectContent>
            </Select>,
        );

        const trigger = screen.getByRole('combobox', { name: 'Board' });

        expect(trigger).toHaveAttribute('aria-invalid', 'true');
        expect(trigger).toHaveClass(
            'aria-invalid:border-danger',
            'aria-invalid:outline-danger',
        );
    });

    it('renders disabled at 60% opacity', () => {
        render(
            <Select disabled>
                <SelectTrigger aria-label="Board">
                    <SelectValue placeholder="Pick a board" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="g">Technology</SelectItem>
                </SelectContent>
            </Select>,
        );

        const trigger = screen.getByRole('combobox', { name: 'Board' });

        expect(trigger).toBeDisabled();
        expect(trigger).toHaveClass(
            'disabled:opacity-60',
            'disabled:cursor-not-allowed',
        );
    });

    it('opens onto an elevated surface listing every option', () => {
        renderSelect({ defaultOpen: true });

        const listbox = screen.getByRole('listbox');

        expect(listbox).toBeInTheDocument();
        expect(
            screen.getByRole('option', { name: 'Technology' }),
        ).toBeVisible();
        expect(
            screen.getByRole('option', { name: 'Wallpapers' }),
        ).toBeVisible();

        const content = document.querySelector('[data-slot="select-content"]');

        expect(content).toHaveClass(
            'bg-surface-elevated',
            'border-border-strong',
            'rounded-md',
        );
    });

    it('highlights the focused option with the hover surface', () => {
        renderSelect({ defaultOpen: true });

        const option = screen.getByRole('option', { name: 'Technology' });

        expect(option).toHaveClass(
            'focus:bg-surface-hover',
            'focus:text-foreground',
        );
    });
});
