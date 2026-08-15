import { Link } from '@inertiajs/react';
import { Bookmark, ImageIcon, MessageSquare } from 'lucide-react';
import { ProfileCommentList } from '@/components/account/profile-comment-list';
import { ProfileHeader } from '@/components/account/profile-header';
import { EmptyState } from '@/components/clover/empty-state';
import { MediaPlaceholder } from '@/components/clover/media-placeholder';
import { PageMeta } from '@/components/clover/page-meta';
import { ThreadCard } from '@/components/clover/thread-card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBookmark } from '@/hooks/use-bookmark';
import { bookmarks } from '@/routes';
import type {
    Profile,
    ProfileComment,
    ProfileStat,
    Thread,
} from '@/types/clover';

/**
 * The signed-in anon's own account screen.
 *
 * The design carries a sixth "Settings" tab holding display name, bio and
 * tripcode fields plus a preferences panel. It is not ported: this app has real
 * settings at /settings, backed by Fortify and a controller that persists. Two
 * editors for one set of fields is a defect, so "Edit profile" in the header
 * points at the real one instead.
 */
/**
 * Three tabs, not five.
 *
 * "Overview" and "Posts" went. Overview was a summary of the tabs beside it —
 * a recent-activity list and a "top thread" panel that read "No threads yet"
 * on any account that had not started one, which is every account, because
 * Clover accepts no new threads. Posts listed the same threads that panel was
 * empty about.
 *
 * What is left is what an anon actually has here: what they wrote, what they
 * attached to it, and what they saved.
 */
const TABS = [
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
};

export default function Account({
    profile,
    stats,
    comments,
    media,
    saved,
}: AccountProps) {
    const { toggleBookmark, authGate } = useBookmark();

    return (
        <>
            <PageMeta
                title="Account"
                description="Your posts, replies, saved threads and the boards you follow, counted from your own record."
            />

            <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-5 px-6 py-6">
                <ProfileHeader profile={profile} stats={stats} />

                <Tabs defaultValue="comments">
                    <TabsList aria-label="Profile sections">
                        {TABS.map((tab) => (
                            <TabsTrigger key={tab.value} value={tab.value}>
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>

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
                                        onBookmark={() =>
                                            toggleBookmark(thread)
                                        }
                                    />
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {authGate}
        </>
    );
}
