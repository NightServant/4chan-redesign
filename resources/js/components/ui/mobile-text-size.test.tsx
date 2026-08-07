import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

/**
 * Safari on iOS zooms the viewport whenever a focused form control renders text
 * below 16px, which shoves the layout sideways mid-typing. Clover's `text-body`
 * is 15px, so the text controls step up to 16px on small screens and drop to the
 * token size from `md` up, where no zoom behaviour applies.
 */
describe('text controls avoid iOS zoom-on-focus', () => {
    it('renders the input at 16px below md', () => {
        render(<Input aria-label="Subject" />);

        const classes = screen.getByLabelText('Subject').className;

        expect(classes).toContain('text-base');
        expect(classes).toContain('md:text-body');
    });

    it('renders the textarea at 16px below md', () => {
        render(<Textarea aria-label="Comment" />);

        const classes = screen.getByLabelText('Comment').className;

        expect(classes).toContain('text-base');
        expect(classes).toContain('md:text-body');
    });

    it('renders the select trigger at 16px below md', () => {
        render(
            <Select>
                <SelectTrigger aria-label="Board">
                    <SelectValue placeholder="Pick a board" />
                </SelectTrigger>
            </Select>,
        );

        const classes = screen.getByLabelText('Board').className;

        expect(classes).toContain('text-base');
        expect(classes).toContain('md:text-body');
    });
});
