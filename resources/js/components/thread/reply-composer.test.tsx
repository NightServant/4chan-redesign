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
        expect(onReply).toHaveBeenCalledWith('Checked, and it holds up.', null);
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

        /* Attach image, then Post reply. The file input itself is out of the
           tab order on purpose: `sr-only` paints no focus ring, so tabbing to
           it would land a keyboard user on something they cannot see. */
        await user.tab();
        expect(
            screen.getByRole('button', { name: 'Attach image' }),
        ).toHaveFocus();

        await user.tab();
        expect(
            screen.getByRole('button', { name: 'Post reply' }),
        ).toHaveFocus();

        await user.keyboard('{Enter}');

        expect(onReply).toHaveBeenCalledWith('Checked, and it holds up.', null);
    });

    it('seeds the anon mark from the thread number', () => {
        const { container } = render(<ReplyComposer threadNo={58210441} />);

        expect(
            container.querySelector('[data-slot="anon-avatar"]'),
        ).toBeInTheDocument();
    });

    /**
     * Attaching an image, which is the whole point of an image board and was
     * the one thing a reply here could not do.
     */
    it('hands the attached file up with the body', async () => {
        const user = userEvent.setup();
        const onReply = vi.fn();
        render(<ReplyComposer threadNo={58210441} onReply={onReply} />);

        const file = new File(['bytes'], 'x230.png', { type: 'image/png' });

        await user.upload(screen.getByTestId('reply-media'), file);
        await user.type(
            screen.getByLabelText('Reply to this thread'),
            'Here it is.',
        );
        await user.click(screen.getByRole('button', { name: 'Post reply' }));

        expect(onReply).toHaveBeenCalledWith('Here it is.', file);
    });

    /**
     * A reply that is only a picture is the most ordinary thing on an image
     * board, and the server accepts one. A Post button disabled for a case the
     * request would have honoured is the same defect as one that does nothing.
     */
    it('can post an image with no words', async () => {
        const user = userEvent.setup();
        const onReply = vi.fn();
        render(<ReplyComposer threadNo={58210441} onReply={onReply} />);

        expect(
            screen.getByRole('button', { name: 'Post reply' }),
        ).toBeDisabled();

        const file = new File(['bytes'], 'quiet.png', { type: 'image/png' });
        await user.upload(screen.getByTestId('reply-media'), file);

        expect(
            screen.getByRole('button', { name: 'Post reply' }),
        ).toBeEnabled();

        await user.click(screen.getByRole('button', { name: 'Post reply' }));

        expect(onReply).toHaveBeenCalledWith('', file);
    });

    it('previews the attachment and can drop it again', async () => {
        const user = userEvent.setup();
        render(<ReplyComposer threadNo={58210441} />);

        const file = new File(['bytes'], 'x230.png', { type: 'image/png' });
        await user.upload(screen.getByTestId('reply-media'), file);

        expect(
            screen.getByRole('img', { name: 'Attached image: x230.png' }),
        ).toBeInTheDocument();

        await user.click(
            screen.getByRole('button', { name: 'Remove attachment' }),
        );

        expect(
            screen.queryByRole('img', { name: /attached image/i }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Post reply' }),
        ).toBeDisabled();
    });

    /**
     * What an anon typed survives a rejected submit.
     *
     * It did not. `handleSubmit` called `onReply` and then cleared the body
     * and the attachment unconditionally, in the same tick, before the server
     * had answered. The page issues the `POST` and never passed the outcome
     * back, so a reply refused for length, for an unsupported file, or for
     * being posted to a pruned thread took the anon's text with it and said
     * nothing at all. Every validation rule in `ReplyController::store` is a
     * way to reach that.
     *
     * `onReply` now reports the outcome, and the field is cleared only on the
     * strength of it.
     */
    it('keeps the typed reply when the server rejects it', async () => {
        const onReply = vi.fn().mockResolvedValue(false);

        render(<ReplyComposer threadNo={58210441} onReply={onReply} />);

        const field = screen.getByRole('textbox', {
            name: /reply to this thread/i,
        });

        await userEvent.type(field, 'Mainline or vendor tree?');
        await userEvent.click(
            screen.getByRole('button', { name: 'Post reply' }),
        );

        expect(onReply).toHaveBeenCalled();
        expect(field).toHaveValue('Mainline or vendor tree?');
    });

    it('clears the field once the reply is actually stored', async () => {
        const onReply = vi.fn().mockResolvedValue(true);

        render(<ReplyComposer threadNo={58210441} onReply={onReply} />);

        const field = screen.getByRole('textbox', {
            name: /reply to this thread/i,
        });

        await userEvent.type(field, 'Eight cores, and it is usable.');
        await userEvent.click(
            screen.getByRole('button', { name: 'Post reply' }),
        );

        expect(field).toHaveValue('');
    });

    /**
     * The server's own words, next to the field that caused them, rather than
     * a toast in the corner or nothing at all.
     */
    it('shows the error the server gave for the body', () => {
        render(
            <ReplyComposer
                threadNo={58210441}
                error="The body may not be greater than 2000 characters."
            />,
        );

        expect(
            screen.getByText(
                'The body may not be greater than 2000 characters.',
            ),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('textbox', { name: /reply to this thread/i }),
        ).toHaveAttribute('aria-invalid', 'true');
    });

    /**
     * The picker has to offer what the validator accepts. A file dialog
     * listing formats the request will reject is a dialog that lies.
     */
    it('offers only the formats the server takes', () => {
        render(<ReplyComposer threadNo={58210441} />);

        expect(screen.getByTestId('reply-media')).toHaveAttribute(
            'accept',
            'image/jpeg,image/png,image/gif,image/webp',
        );
    });
});
