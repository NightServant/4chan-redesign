import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageSquare, Shield } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { NotificationItem } from '@/components/clover/notification-item';
import { makeActivity } from '@/fixtures/factories';

const ACTIVITY = [
    makeActivity({ text: 'You replied in /g/', time: '2 min ago' }),
    makeActivity({
        icon: 'bookmark',
        text: 'You saved a thread in /x/',
        time: '1 hr ago',
    }),
    makeActivity({
        icon: 'message-square',
        text: 'You started a thread in /biz/',
        time: '3 hr ago',
    }),
];

describe('NotificationItem', () => {
    it('renders the title and meta text from the activity fixture shape', () => {
        const [entry] = ACTIVITY;

        render(
            <NotificationItem
                leading={<MessageSquare />}
                title={entry.text}
                meta={entry.time}
            />,
        );

        expect(screen.getByText(entry.text)).toBeInTheDocument();
        expect(screen.getByText(entry.time)).toBeInTheDocument();
    });

    it('renders as a static row, not a card, when it has no href or onClick', () => {
        const entry = ACTIVITY[2];

        render(
            <NotificationItem
                leading={<Shield />}
                title={entry.text}
                meta={entry.time}
            />,
        );

        const row = screen
            .getByText(entry.text)
            .closest('[data-slot="notification-item"]');

        expect(row?.tagName).toBe('DIV');
        expect(row).not.toHaveClass('border');
        expect(row).toHaveClass('border-b');
    });

    it('renders as a real button when onClick is given, never a div with an onClick', async () => {
        const user = userEvent.setup();
        const onClick = vi.fn();
        const entry = ACTIVITY[0];

        render(
            <NotificationItem
                leading={<MessageSquare />}
                title={entry.text}
                meta={entry.time}
                onClick={onClick}
            />,
        );

        const row = screen.getByRole('button', {
            name: new RegExp(entry.text),
        });
        await user.click(row);

        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('renders as a real anchor when href is given', () => {
        const entry = ACTIVITY[1];

        render(
            <NotificationItem
                leading={<MessageSquare />}
                title={entry.text}
                meta={entry.time}
                href="/notifications/1"
            />,
        );

        const row = screen.getByRole('link', { name: new RegExp(entry.text) });

        expect(row).toHaveAttribute('href', '/notifications/1');
    });

    it('exposes the unread state to assistive technology, not by colour alone', () => {
        const entry = ACTIVITY[0];

        render(
            <NotificationItem
                leading={<MessageSquare />}
                title={entry.text}
                meta={entry.time}
                unread
            />,
        );

        const row = screen
            .getByText(entry.text)
            .closest('[data-slot="notification-item"]') as HTMLElement;

        expect(within(row).getByText(/unread/i)).toBeInTheDocument();
    });

    it('does not announce unread when the notification has been read', () => {
        const entry = ACTIVITY[0];

        render(
            <NotificationItem
                leading={<MessageSquare />}
                title={entry.text}
                meta={entry.time}
            />,
        );

        expect(screen.queryByText(/unread/i)).not.toBeInTheDocument();
    });

    it('applies the caption/faint treatment to meta text', () => {
        const entry = ACTIVITY[0];

        render(
            <NotificationItem
                leading={<MessageSquare />}
                title={entry.text}
                meta={entry.time}
            />,
        );

        expect(screen.getByText(entry.time)).toHaveClass(
            'text-caption',
            'text-faint',
        );
    });

    it('merges consumer classes over the defaults', () => {
        const entry = ACTIVITY[0];

        render(
            <NotificationItem
                leading={<MessageSquare />}
                title={entry.text}
                meta={entry.time}
                className="py-6"
            />,
        );

        const row = screen
            .getByText(entry.text)
            .closest('[data-slot="notification-item"]');

        expect(row).toHaveClass('py-6');
    });
});
