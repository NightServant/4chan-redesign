import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MessageThread } from '@/components/messages/message-thread';
import { CONVERSATIONS } from '@/fixtures/clover';

const CONVERSATION = CONVERSATIONS[0];

function renderThread() {
    const onSend = vi.fn();
    const onBack = vi.fn();

    render(
        <MessageThread
            conversation={CONVERSATION}
            onSend={onSend}
            onBack={onBack}
        />,
    );

    return { onSend, onBack };
}

describe('MessageThread', () => {
    it('names the correspondent in the pane heading', () => {
        renderThread();

        expect(
            screen.getByRole('heading', { level: 2, name: 'anon_7781' }),
        ).toBeInTheDocument();
    });

    it('renders the messages as a real list', () => {
        renderThread();

        const list = screen.getByRole('list', { name: 'Messages' });

        expect(within(list).getAllByRole('listitem')).toHaveLength(
            CONVERSATION.messages.length,
        );
    });

    it('gives the scroll region an accessible name', () => {
        renderThread();

        expect(
            screen.getByRole('region', {
                name: 'Conversation with anon_7781',
            }),
        ).toBeInTheDocument();
    });

    it('names the sender of every message so direction is not colour alone', () => {
        renderThread();

        const items = within(
            screen.getByRole('list', { name: 'Messages' }),
        ).getAllByRole('listitem');

        expect(within(items[0]).getByText('anon_7781')).toBeInTheDocument();
        expect(within(items[1]).getByText('You')).toBeInTheDocument();
    });

    it('goes back to the list when the back control is used', async () => {
        const user = userEvent.setup();
        const { onBack } = renderThread();

        await user.click(
            screen.getByRole('button', { name: 'Back to conversations' }),
        );

        expect(onBack).toHaveBeenCalledOnce();
    });

    it('hands a written message up to the caller', async () => {
        const user = userEvent.setup();
        const { onSend } = renderThread();

        await user.type(
            screen.getByLabelText('Message anon_7781'),
            'It runs on post now.',
        );
        await user.click(screen.getByRole('button', { name: 'Send' }));

        expect(onSend).toHaveBeenCalledWith('It runs on post now.');
    });
});
