import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MessageInbox } from '@/components/messages/inbox';
import { CONVERSATIONS } from '@/fixtures/clover';

function renderInbox(conversations = CONVERSATIONS) {
    render(<MessageInbox conversations={conversations} />);
}

describe('MessageInbox', () => {
    it('counts conversations and unread messages in the page description', () => {
        renderInbox();

        expect(
            screen.getByText('3 conversations · 2 unread'),
        ).toBeInTheDocument();
    });

    it('opens the first conversation rather than showing nothing', () => {
        renderInbox();

        expect(
            screen.getByRole('heading', { level: 2, name: 'anon_7781' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'anon_7781, 2 unread' }),
        ).toHaveAttribute('aria-current', 'true');
    });

    it('swaps the open conversation when another row is selected', async () => {
        const user = userEvent.setup();
        renderInbox();

        await user.click(screen.getByRole('button', { name: 'anon_5530' }));

        expect(
            screen.getByRole('heading', { level: 2, name: 'anon_5530' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('region', { name: 'Conversation with anon_5530' }),
        ).toBeInTheDocument();
    });

    it('appends a sent message to the open conversation', async () => {
        const user = userEvent.setup();
        renderInbox();

        const list = screen.getByRole('list', { name: 'Messages' });

        expect(within(list).getAllByRole('listitem')).toHaveLength(4);

        await user.type(
            screen.getByLabelText('Message anon_7781'),
            'Moving the filter ahead of the bump.',
        );
        await user.click(screen.getByRole('button', { name: 'Send' }));

        expect(
            within(screen.getByRole('list', { name: 'Messages' })).getAllByRole(
                'listitem',
            ),
        ).toHaveLength(5);
        expect(
            screen.getByText('Moving the filter ahead of the bump.'),
        ).toBeInTheDocument();
    });

    it('keeps a sent message with its own conversation', async () => {
        const user = userEvent.setup();
        renderInbox();

        await user.type(screen.getByLabelText('Message anon_7781'), 'Noted.');
        await user.click(screen.getByRole('button', { name: 'Send' }));
        await user.click(screen.getByRole('button', { name: 'anon_5530' }));

        expect(screen.queryByText('Noted.')).not.toBeInTheDocument();
    });

    it('states the absence plainly when there are no conversations', () => {
        renderInbox([]);

        expect(
            screen.getByRole('heading', { name: 'No messages' }),
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                'Anons can message you about a thread you posted in. Nothing arrives unprompted.',
            ),
        ).toBeInTheDocument();
        expect(screen.queryByRole('list', { name: 'Messages' })).toBeNull();
    });
});
