import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MessageComposer } from '@/components/messages/message-composer';
import { POST_MAX_LENGTH } from '@/lib/posting';

function renderComposer() {
    const onSend = vi.fn();

    render(<MessageComposer handle="anon_7781" onSend={onSend} />);

    return {
        onSend,
        field: screen.getByLabelText('Message anon_7781'),
        send: screen.getByRole('button', { name: 'Send' }),
    };
}

describe('MessageComposer', () => {
    it('labels the field with the correspondent it writes to', () => {
        const { field } = renderComposer();

        expect(field).toBeInTheDocument();
    });

    it('keeps Send disabled until something has been written', async () => {
        const user = userEvent.setup();
        const { field, send } = renderComposer();

        expect(send).toBeDisabled();

        await user.type(field, 'Filter runs on post, not on bump.');

        expect(send).toBeEnabled();
    });

    it('keeps Send disabled for whitespace alone', async () => {
        const user = userEvent.setup();
        const { field, send } = renderComposer();

        await user.type(field, '   ');

        expect(send).toBeDisabled();
    });

    it('hands the trimmed body up and clears the field', async () => {
        const user = userEvent.setup();
        const { field, send, onSend } = renderComposer();

        await user.type(field, '  Reposting at the correct size.  ');
        await user.click(send);

        expect(onSend).toHaveBeenCalledWith('Reposting at the correct size.');
        expect(field).toHaveValue('');
    });

    it('counts characters against the shared post limit', async () => {
        const user = userEvent.setup();
        const { field } = renderComposer();

        expect(screen.getByText(`0/${POST_MAX_LENGTH}`)).toBeInTheDocument();

        await user.type(field, 'four');

        expect(screen.getByText(`4/${POST_MAX_LENGTH}`)).toBeInTheDocument();
    });

    it('refuses to send a body over the limit', async () => {
        const user = userEvent.setup();
        const { field, send } = renderComposer();

        await user.click(field);
        await user.paste('x'.repeat(POST_MAX_LENGTH + 1));

        expect(screen.getByText('Over the limit')).toBeInTheDocument();
        expect(send).toBeDisabled();
    });
});
