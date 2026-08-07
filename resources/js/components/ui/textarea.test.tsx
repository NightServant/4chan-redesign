import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Textarea } from '@/components/ui/textarea';

describe('Textarea', () => {
    it('renders a multiline textbox that accepts typed value', async () => {
        const user = userEvent.setup();
        render(<Textarea aria-label="Comment" />);

        const textarea = screen.getByRole('textbox', { name: 'Comment' });
        await user.type(textarea, 'sage goes in all fields');

        expect(textarea.tagName).toBe('TEXTAREA');
        expect(textarea).toHaveValue('sage goes in all fields');
    });

    it('matches the Input treatment and grows vertically only', () => {
        render(<Textarea aria-label="Comment" />);

        const textarea = screen.getByRole('textbox', { name: 'Comment' });

        expect(textarea).toHaveClass(
            'rounded-md',
            'bg-surface',
            'border',
            'border-border',
            'resize-y',
            'min-h-24',
        );
    });

    it('keeps a visible focus ring and never removes the outline', () => {
        render(<Textarea aria-label="Comment" />);

        const textarea = screen.getByRole('textbox', { name: 'Comment' });

        expect(textarea).toHaveClass(
            'focus-visible:outline-2',
            'focus-visible:outline-offset-2',
            'focus-visible:outline-ring',
        );
        expect(textarea.className).not.toContain('outline-none');
        expect(textarea.className).not.toContain('outline-hidden');
    });

    it('marks the invalid state with the danger token', () => {
        render(<Textarea aria-label="Comment" aria-invalid />);

        const textarea = screen.getByRole('textbox', { name: 'Comment' });

        expect(textarea).toHaveAttribute('aria-invalid', 'true');
        expect(textarea).toHaveClass(
            'aria-invalid:border-danger',
            'aria-invalid:outline-danger',
        );
    });

    it('renders disabled at 60% opacity', () => {
        render(<Textarea aria-label="Comment" disabled />);

        const textarea = screen.getByRole('textbox', { name: 'Comment' });

        expect(textarea).toBeDisabled();
        expect(textarea).toHaveClass(
            'disabled:opacity-60',
            'disabled:cursor-not-allowed',
        );
    });

    it('merges consumer classes and forwards rows', () => {
        render(<Textarea aria-label="Comment" rows={8} className="min-h-40" />);

        const textarea = screen.getByRole('textbox', { name: 'Comment' });

        expect(textarea).toHaveAttribute('rows', '8');
        expect(textarea).toHaveClass('min-h-40');
        expect(textarea).not.toHaveClass('min-h-24');
    });
});
