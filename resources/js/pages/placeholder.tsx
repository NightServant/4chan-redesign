import { Head } from '@inertiajs/react';
import { BellIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/clover/empty-state';

/**
 * The screen behind every sidebar destination that has no real page yet.
 *
 * Copy is per destination rather than one generic "coming soon", because a
 * shared placeholder that says nothing specific is indistinguishable from a
 * bug.
 *
 * Only `notifications` is left: account, bookmarks, communities, history and
 * messages all have real screens now, and their entries were deleted rather
 * than kept "in case". An unreachable branch is not a spare, it is a claim
 * about the routing that nothing checks.
 */
type Destination = 'notifications';

const PLACEHOLDERS: Record<
    Destination,
    { icon: ReactNode; heading: string; title: string; body: string }
> = {
    notifications: {
        icon: <BellIcon />,
        heading: 'Notifications',
        title: 'You are caught up',
        body: 'Replies and janitor actions appear here.',
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
