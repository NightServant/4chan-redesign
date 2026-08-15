import { Link } from '@inertiajs/react';
import { BellIcon, BookmarkIcon, MessageSquareIcon } from 'lucide-react';
import { EmptyState } from '@/components/clover/empty-state';
import { MachineValue } from '@/components/clover/machine-value';
import { NotificationItem } from '@/components/clover/notification-item';
import { PageHeader } from '@/components/clover/page-header';
import { PageMeta } from '@/components/clover/page-meta';
import { Button } from '@/components/ui/button';
import { plural } from '@/lib/utils';
import { popular } from '@/routes';
import type { ThreadNotification } from '@/types/clover';

/**
 * New replies in threads this anon is in.
 *
 * This was the last placeholder in the product. It said "Replies and janitor
 * actions appear here", which named two things that do not exist: there is no
 * janitor queue, and no reply is addressed to an account, because a post here
 * carries no identity to address.
 *
 * So the notification belongs to the thread rather than to a person. An anon
 * who saved a thread or posted in one has said they care about it; posts
 * arrived in it after they last looked; that is worth telling them, and it is
 * derivable from rows this application already has. See `ThreadNotifications`
 * for the watermark that decides what counts as new.
 *
 * The empty state says all of that in a sentence, because "You are caught up"
 * on a screen that could never have shown anything is the same lie the
 * placeholder told.
 */
type NotificationsProps = {
    /** Newest arrival first. Empty is an ordinary state, not a failure. */
    notifications: ThreadNotification[];
};

/**
 * Why this thread is being watched, in the row's own words.
 *
 * Two reasons, and they are not decoration: an anon looking at a list of
 * threads they did not choose one by one needs to know which of their own
 * actions put each one there.
 */
const REASON_TEXT: Record<ThreadNotification['reason'], string> = {
    saved: 'in a thread you saved',
    posted: 'in a thread you posted in',
};

const REASON_ICON: Record<ThreadNotification['reason'], typeof BellIcon> = {
    saved: BookmarkIcon,
    posted: MessageSquareIcon,
};

export default function Notifications({ notifications }: NotificationsProps) {
    return (
        <>
            <PageMeta
                title="Notifications"
                description="New replies in the threads you saved or posted in."
            />

            <div className="mx-auto flex w-full max-w-(--measure-column) flex-col gap-[18px] px-6 py-6">
                <PageHeader
                    title="Notifications"
                    description="New replies in threads you saved or posted in."
                />

                {notifications.length === 0 ? (
                    <EmptyState
                        icon={<BellIcon />}
                        title="Nothing new in your threads"
                        body="Clover cannot notify you personally: a post carries no identity, so there is nobody for a reply to be addressed to. It watches the threads you save and post in instead, and tells you when replies arrive in them."
                        action={
                            <Button variant="outline" asChild>
                                <Link href={popular()}>Find a thread</Link>
                            </Button>
                        }
                    />
                ) : (
                    <div className="flex flex-col">
                        {notifications.map((notification) => {
                            const Icon = REASON_ICON[notification.reason];

                            return (
                                <NotificationItem
                                    key={notification.threadId}
                                    leading={<Icon />}
                                    href={`${notification.board}${notification.no}`}
                                    unread
                                    title={
                                        <>
                                            <MachineValue className="text-foreground">
                                                {plural(
                                                    notification.replies,
                                                    'new reply',
                                                    'new replies',
                                                )}
                                            </MachineValue>{' '}
                                            {REASON_TEXT[notification.reason]}
                                        </>
                                    }
                                    meta={`${notification.board} · ${notification.title} · ${notification.time}`}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}
