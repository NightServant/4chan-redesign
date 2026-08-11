import { Head, Link } from '@inertiajs/react';
import {
    Bookmark,
    ImageIcon,
    MessageSquare,
    PencilLine,
} from 'lucide-react';
import { AccountOverview } from '@/components/account/account-overview';
import { ProfileCommentList } from '@/components/account/profile-comment-list';
import { ProfileHeader } from '@/components/account/profile-header';
import { EmptyState } from '@/components/clover/empty-state';
import { MediaPlaceholder } from '@/components/clover/media-placeholder';
import { ThreadCard } from '@/components/clover/thread-card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { bookmarks } from '@/routes';
import type {
    ActivityEntry,
    Profile,
    ProfileComment,
    ProfileStat,
    Thread,
} from '@/types/clover';

/**
 * The signed-in anon's own account screen.
 *
 * The design carries a sixth "Settings" tab holding display name, bio and
 * tripcode fields plus a preferences panel. It is not ported: this app has
 * real settings at /settings/profile, /settings/security and
 * /settings/appearance, backed by Fortify and a controller that persists.
 * Two editors for one set of fields is a defect, so "Edit profile" in the
 * header points at the real one instead.
 */
const TABS = [
    { value: 'overview', label: 'Overview' },
    { value: 'posts', label: 'Posts' },
    { value: 'comments', label: 'Comments' },
    { value: 'media', label: 'Media' },
    { value: 'saved', label: 'Saved' },
] as const;

type AccountProps = {
    profile: Profile;
    /** Counted from this anon's own record. Zero where they have done nothing. */
    stats: ProfileStat[];
    /** Replies this anon wrote, newest first. */
    comments: ProfileComment[];
    /** Labels for attachments on their own posts. Empty until Clover accepts files. */
    media: string[];
    /** Threads they saved, as full cards. */
    saved: Thread[];
    /** Threads this anon started. */
    started: Thread[];
    activity: ActivityEntry[];
};

export default function Account({
    profile,
    stats,
    comments,
    media,
    saved,
    started,
    activity,
}: AccountProps) {
    return (
        <>
            <Head title="Account" />

            <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-5 px-6 py-6">
                <ProfileHeader profile={profile} stats={stats} />

                <Tabs defaultValue="overview">
                    <TabsList aria-label="Profile sections">
                        {TABS.map((tab) => (
                            <TabsTrigger key={tab.value} value={tab.value}>
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <TabsContent value="overview">
                        <AccountOverview activity={activity} />
                    </TabsContent>

                    {/* Threads this anon started, which is now a real thing
                        they can do. Empty until they do it, rather than a list
                        of ingested threads presented as theirs. */}
                    <TabsContent value="posts">
                        {started.length === 0 ? (
                            <EmptyState
                                icon={<PencilLine />}
                                title="No posts yet"
                                body="Threads you start appear here in bump order."
                            />
                        ) : (
                            <div className="flex flex-col gap-4">
                                {started.map((thread) => (
                                    <ThreadCard
                                        key={thread.no}
                                        thread={thread}
                                    />
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="comments">
                        {comments.length === 0 ? (
                            <EmptyState
                                icon={<MessageSquare />}
                                title="No replies yet"
                                body="Replies you write appear here, newest first."
                            />
                        ) : (
                            <ProfileCommentList comments={comments} />
                        )}
                    </TabsContent>

                    <TabsContent value="media">
                        {/* Their own uploads. Clover accepts no files yet, so
                            this is empty rather than filled with attachments
                            from threads they merely read — which would claim
                            they posted them. */}
                        {media.length === 0 ? (
                            <EmptyState
                                icon={<ImageIcon />}
                                title="No media yet"
                                body="Attachments on your own posts appear here."
                            />
                        ) : (
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
                                {media.map((label) => (
                                    <MediaPlaceholder
                                        key={label}
                                        label={label}
                                        height={150}
                                    />
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="saved">
                        {saved.length === 0 ? (
                            <EmptyState
                                icon={<Bookmark />}
                                title="Nothing saved yet"
                                body="Bookmarked threads land here and stay until you remove them."
                                action={
                                    <Button variant="outline" asChild>
                                        <Link href={bookmarks()}>
                                            Open bookmarks
                                        </Link>
                                    </Button>
                                }
                            />
                        ) : (
                            <div className="flex flex-col gap-4">
                                {saved.map((thread) => (
                                    <ThreadCard
                                        key={thread.no}
                                        thread={thread}
                                    />
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}
