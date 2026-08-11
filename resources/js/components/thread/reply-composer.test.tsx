import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ReplyComposer } from '@/components/thread/reply-composer';

describe('ReplyComposer', () => {
    it('labels the textarea with a real label, not a placeholder standing in for one', () => {
        render(<ReplyComposer threadNo={58210441} />);

        const field = screen.getByLabelText('Reply to this thread');

        expect(field.tagName).toBe('TEXTAREA');
        // A placeholder is not a substitute for the label: it must still be
        // present as a hint, not as the only name the control has.
        expect(field).toHaveAttribute('placeholder');
    });

    it('disables submit for an empty reply', () => {
        render(<ReplyComposer threadNo={58210441} />);

        expect(
            screen.getByRole('button', { name: 'Post reply' }),
        ).toBeDisabled();
    });

    it('disables submit for a whitespace-only reply', async () => {
        const user = userEvent.setup();
        render(<ReplyComposer threadNo={58210441} />);

        await user.type(screen.getByLabelText('Reply to this thread'), '     ');

        expect(
            screen.getByRole('button', { name: 'Post reply' }),
        ).toBeDisabled();
    });

    it('enables submit once real text is typed', async () => {
        const user = userEvent.setup();
        render(<ReplyComposer threadNo={58210441} />);

        await user.type(
            screen.getByLabelText('Reply to this thread'),
            'Checked, and it holds up.',
        );

        expect(
            screen.getByRole('button', { name: 'Post reply' }),
        ).toBeEnabled();
    });

    it('calls onReply with the body and clears the field on submit', async () => {
        const user = userEvent.setup();
        const onReply = vi.fn();
        render(<ReplyComposer threadNo={58210441} onReply={onReply} />);

        const field = screen.getByLabelText('Reply to this thread');
        await user.type(field, 'Checked, and it holds up.');
        await user.click(screen.getByRole('button', { name: 'Post reply' }));

        expect(onReply).toHaveBeenCalledTimes(1);
        expect(onReply).toHaveBeenCalledWith('Checked, and it holds up.');
        expect(field).toHaveValue('');
    });

    it('does not require onReply to be passed', async () => {
        const user = userEvent.setup();
        render(<ReplyComposer threadNo={58210441} />);

        await user.type(
            screen.getByLabelText('Reply to this thread'),
            'No handler wired up, and that is fine.',
        );

        await expect(
            user.click(screen.getByRole('button', { name: 'Post reply' })),
        ).resolves.not.toThrow();
    });

    it('shows a character counter that reflects the typed length against the limit', async () => {
        const user = userEvent.setup();
        render(<ReplyComposer threadNo={58210441} />);

        expect(screen.getByText('0/2000')).toBeInTheDocument();

        await user.type(
            screen.getByLabelText('Reply to this thread'),
            'twelve chars',
        );

        expect(screen.getByText('12/2000')).toBeInTheDocument();
    });

    it('disables submit past the limit and signals the overage by more than colour', async () => {
        const user = userEvent.setup();
        render(<ReplyComposer threadNo={58210441} />);

        const field = screen.getByLabelText('Reply to this thread');
        const overLong = 'a'.repeat(2001);
        // fireEvent-style paste is far faster than per-key typing for 2001
        // characters and exercises the same onChange path.
        await user.click(field);
        await user.paste(overLong);

        expect(screen.getByText('2001/2000')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Post reply' }),
        ).toBeDisabled();
        // The signal must not be colour alone: distinct text content is the
        // proof, independent of any className assertion.
        expect(screen.getByText('Over the limit')).toBeInTheDocument();
    });

    /**
     * `max_comment_chars` is per board upstream (2000, 3000 or 5000), so the
     * composer takes it as a prop. These are the negative control for the
     * single global constant it replaced: pass a limit that is not 2000 and the
     * counter has to follow it.
     */
    it("counts against the board's own limit when one is passed", async () => {
        const user = userEvent.setup();
        render(<ReplyComposer threadNo={58210441} maxCommentChars={5000} />);

        expect(screen.getByText('0/5000')).toBeInTheDocument();

        await user.type(
            screen.getByLabelText('Reply to this thread'),
            'twelve chars',
        );

        expect(screen.getByText('12/5000')).toBeInTheDocument();
    });

    it('accepts a body the fallback limit would reject when the board allows it', async () => {
        const user = userEvent.setup();
        render(<ReplyComposer threadNo={58210441} maxCommentChars={5000} />);

        const field = screen.getByLabelText('Reply to this thread');
        await user.click(field);
        await user.paste('a'.repeat(2500));

        expect(screen.getByText('2500/5000')).toBeInTheDocument();
        expect(screen.queryByText('Over the limit')).not.toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Post reply' }),
        ).toBeEnabled();
    });

    it('rejects a body past a stricter board limit than the fallback', async () => {
        const user = userEvent.setup();
        render(<ReplyComposer threadNo={58210441} maxCommentChars={500} />);

        const field = screen.getByLabelText('Reply to this thread');
        await user.click(field);
        await user.paste('a'.repeat(501));

        expect(screen.getByText('501/500')).toBeInTheDocument();
        expect(screen.getByText('Over the limit')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Post reply' }),
        ).toBeDisabled();
    });

    it('names the two formatting rules in one hint line', () => {
        render(<ReplyComposer threadNo={58210441} />);

        expect(screen.getByText(/greentext/)).toBeInTheDocument();
        expect(screen.getByText(/>>/)).toBeInTheDocument();
    });

    it('never uses an em dash or double hyphen in its copy', () => {
        const { container } = render(<ReplyComposer threadNo={58210441} />);

        expect(container.textContent).not.toMatch(/—|--/);
    });

    it('completes the whole flow from the keyboard alone', async () => {
        const user = userEvent.setup();
        const onReply = vi.fn();
        render(<ReplyComposer threadNo={58210441} onReply={onReply} />);

        await user.tab();
        expect(screen.getByLabelText('Reply to this thread')).toHaveFocus();

        await user.keyboard('Checked, and it holds up.');
        await user.tab();
        expect(
            screen.getByRole('button', { name: 'Post reply' }),
        ).toHaveFocus();

        await user.keyboard('{Enter}');

        expect(onReply).toHaveBeenCalledWith('Checked, and it holds up.');
    });

    it('seeds the anon mark from the thread number', () => {
        const { container } = render(<ReplyComposer threadNo={58210441} />);

        expect(
            container.querySelector('[data-slot="anon-avatar"]'),
        ).toBeInTheDocument();
    });
});
