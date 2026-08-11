import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConversationList } from '@/components/messages/conversation-list';
import { CONVERSATIONS } from '@/fixtures/clover';

function renderList(selectedId: number | null = null) {
    const onSelect = vi.fn();

    render(
        <ConversationList
            conversations={CONVERSATIONS}
            selectedId={selectedId}
            onSelect={onSelect}
        />,
    );

    return { onSelect };
}

describe('ConversationList', () => {
    it('renders one row per conversation inside a named list', () => {
        renderList();

        const list = screen.getByRole('list', { name: 'Conversations' });

        expect(within(list).getAllByRole('button')).toHaveLength(
            CONVERSATIONS.length,
        );
    });

    it('carries the unread count in the accessible name', () => {
        renderList();

        expect(
            screen.getByRole('button', { name: 'anon_7781, 2 unread' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'anon_0294' }),
        ).toBeInTheDocument();
    });

    it('shows the unread count as a badge as well as in the name', () => {
        renderList();

        const row = screen.getByRole('button', { name: 'anon_7781, 2 unread' });

        expect(within(row).getByText('2')).toBeInTheDocument();
    });

    it('previews the last message and the conversation time', () => {
        renderList();

        const row = screen.getByRole('button', { name: 'anon_0294' });

        expect(
            within(row).getByText(
                'It is a slow machine that does what I need. That is the whole review.',
            ),
        ).toBeInTheDocument();
        expect(within(row).getByText('1 hr ago')).toBeInTheDocument();
    });

    it('marks only the selected row as current', () => {
        renderList(2);

        expect(
            screen.getByRole('button', { name: 'anon_0294' }),
        ).toHaveAttribute('aria-current', 'true');
        expect(
            screen.getByRole('button', { name: 'anon_7781, 2 unread' }),
        ).not.toHaveAttribute('aria-current');
    });

    it('reports a selection made from the keyboard', async () => {
        const user = userEvent.setup();
        const { onSelect } = renderList();

        await user.tab();
        await user.keyboard('{Enter}');

        expect(onSelect).toHaveBeenCalledWith(CONVERSATIONS[0].id);
    });

    it('reports a selection made with the pointer', async () => {
        const user = userEvent.setup();
        const { onSelect } = renderList();

        await user.click(screen.getByRole('button', { name: 'anon_5530' }));

        expect(onSelect).toHaveBeenCalledWith(3);
    });
});
