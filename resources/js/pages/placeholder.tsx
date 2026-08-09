import { Head } from '@inertiajs/react';
import {
    BellIcon,
    BookmarkIcon,
    HistoryIcon,
    LayoutGridIcon,
    MailIcon,
    UserIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/clover/empty-state';

/**
 * The screen behind every sidebar destination that has no real page yet.
 *
 * Copy is per destination rather than one generic "coming soon", because a
 * shared placeholder that says nothing specific is indistinguishable from a
 * bug. Where the design prototype wrote the copy, it is used as written.
 */
type Destination =
    | 'account'
    | 'communities'
    | 'bookmarks'
    | 'history'
    | 'messages'
    | 'notifications';

const PLACEHOLDERS: Record<
    Destination,
    { icon: ReactNode; heading: string; title: string; body: string }
> = {
    account: {
        icon: <UserIcon />,
        heading: 'Your profile',
        title: 'Your profile',
        body: 'Your posts, blessings and board activity will be collected here. Account settings live under Settings.',
    },
    communities: {
        icon: <LayoutGridIcon />,
        heading: 'Communities',
        title: 'Communities',
        body: 'Board directory lands here. 74 boards with subscribe controls.',
    },
    bookmarks: {
        icon: <BookmarkIcon />,
        heading: 'Bookmarks',
        title: 'No bookmarks yet',
        body: 'Threads you save appear here and stay until you remove them.',
    },
    history: {
        icon: <HistoryIcon />,
        heading: 'History',
        title: 'Nothing read yet',
        body: 'Threads you open are listed here in the order you read them.',
    },
    messages: {
        icon: <MailIcon />,
        heading: 'Messages',
        title: 'No messages',
        body: 'Anons can send you a message when a thread you posted in is answered.',
    },
    notifications: {
        icon: <BellIcon />,
        heading: 'Notifications',
        title: 'You are caught up',
        body: 'Replies, blessings and janitor actions appear here.',
    },
};

export default function Placeholder({
    destination,
}: {
    destination: Destination;
}) {
    const { icon, heading, title, body } = PLACEHOLDERS[destination];

    return (
        <>
            <Head title={heading} />
            <EmptyState icon={icon} title={title} body={body} />
        </>
    );
}
