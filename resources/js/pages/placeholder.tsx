import { Head } from '@inertiajs/react';
import {
    BellIcon,
    BookmarkIcon,
    ClockIcon,
    FlameIcon,
    HistoryIcon,
    LayoutGridIcon,
    MailIcon,
    UserIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/clover/empty-state';
import AppLayout from '@/layouts/app-layout';

/**
 * The screen behind every sidebar destination that has no real page yet.
 *
 * Copy is per destination rather than one generic "coming soon", because a
 * shared placeholder that says nothing specific is indistinguishable from a
 * bug. Where the design prototype wrote the copy, it is used as written.
 */
type Destination =
    | 'account'
    | 'popular'
    | 'latest'
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
    popular: {
        icon: <FlameIcon />,
        heading: 'Popular',
        title: 'Nothing is popular yet',
        body: 'Threads with the most blessings in the last day will be ranked here.',
    },
    latest: {
        icon: <ClockIcon />,
        heading: 'Latest',
        title: 'No threads yet',
        body: 'Every board in bump order, newest first, lands here.',
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
        <AppLayout>
            <Head title={heading} />
            <EmptyState icon={icon} title={title} body={body} />
        </AppLayout>
    );
}
