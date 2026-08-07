import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SearchField } from '@/components/clover/search-field';

describe('SearchField', () => {
    it('is a button, not a live text input', () => {
        render(<SearchField onClick={() => {}} />);

        const trigger = screen.getByRole('button', {
            name: 'Search boards and threads',
        });

        expect(trigger.tagName).toBe('BUTTON');
        expect(trigger).toHaveAttribute('type', 'button');
        expect(screen.queryByRole('textbox')).toBeNull();
        expect(screen.queryByRole('searchbox')).toBeNull();
    });

    it('accepts a custom placeholder as its accessible name', () => {
        render(<SearchField onClick={() => {}} placeholder="Search /g/" />);

        expect(
            screen.getByRole('button', { name: 'Search /g/' }),
        ).toBeInTheDocument();
    });

    it('opens the palette on click', async () => {
        const user = userEvent.setup();
        const onClick = vi.fn();
        render(<SearchField onClick={onClick} />);

        await user.click(screen.getByRole('button'));

        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('is reachable and operable from the keyboard', async () => {
        const user = userEvent.setup();
        const onClick = vi.fn();
        render(<SearchField onClick={onClick} />);

        await user.tab();

        const trigger = screen.getByRole('button');

        expect(trigger).toHaveFocus();

        await user.keyboard('{Enter}');

        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('advertises the Command-K shortcut as typography, not an icon', () => {
        render(<SearchField onClick={() => {}} />);

        const trigger = screen.getByRole('button');

        expect(trigger).toHaveAttribute('aria-keyshortcuts', 'Meta+K');

        const hint = screen.getByText('⌘K');

        expect(hint.tagName).toBe('SPAN');
        expect(hint).toHaveClass('tabular-nums');
        expect(hint).toHaveAttribute('aria-hidden', 'true');
        expect(hint.querySelector('svg')).toBeNull();
        expect(hint.className).not.toContain('font-mono');
    });

    it('renders a decorative search icon that is hidden from assistive tech', () => {
        render(<SearchField onClick={() => {}} />);

        const icon = screen.getByRole('button').querySelector('svg');

        expect(icon).not.toBeNull();
        expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    it('keeps a visible focus ring and never removes the outline', () => {
        render(<SearchField onClick={() => {}} />);

        const trigger = screen.getByRole('button');

        expect(trigger).toHaveClass(
            'focus-visible:outline-2',
            'focus-visible:outline-offset-2',
            'focus-visible:outline-ring',
        );
        expect(trigger.className).not.toContain('outline-none');
    });

    it('uses the shared control metrics and merges consumer classes', () => {
        render(<SearchField onClick={() => {}} className="w-80" />);

        const trigger = screen.getByRole('button');

        expect(trigger).toHaveClass(
            'h-9.5',
            'rounded-md',
            'border-border',
            'bg-surface',
            'w-80',
        );
    });

    it('renders disabled at 60% opacity and does not open', async () => {
        const user = userEvent.setup();
        const onClick = vi.fn();
        render(<SearchField onClick={onClick} disabled />);

        const trigger = screen.getByRole('button');
        await user.click(trigger);

        expect(trigger).toBeDisabled();
        expect(onClick).not.toHaveBeenCalled();
        expect(trigger).toHaveClass(
            'disabled:opacity-60',
            'disabled:cursor-not-allowed',
        );
    });
});
