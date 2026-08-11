import { Head, Link } from '@inertiajs/react';
import { Bookmark, PencilLine } from 'lucide-react';
import { AccountOverview } from '@/components/account/account-overview';
import { ProfileCommentList } from '@/components/account/profile-comment-list';
import { ProfileHeader } from '@/components/account/profile-header';
import { EmptyState } from '@/components/clover/empty-state';
import { MediaPlaceholder } from '@/components/clover/media-placeholder';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    PROFILE,
    PROFILE_COMMENTS,
    PROFILE_MEDIA,
    PROFILE_STATS,
} from '@/fixtures/clover';
import { bookmarks } from '@/routes';

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

export default function Account() {
    return (
        <>
            <Head title="Account" />

            <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-5 px-6 py-6">
                <ProfileHeader profile={PROFILE} stats={PROFILE_STATS} />

                <Tabs defaultValue="overview">
                    <TabsList aria-label="Profile sections">
                        {TABS.map((tab) => (
                            <TabsTrigger key={tab.value} value={tab.value}>
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <TabsContent value="overview">
                        <AccountOverview />
                    </TabsContent>

                    {/* Posts need authorship, and nothing attributes a post
                        to an anon yet: posting arrives in task 11b. This tab
                        used to list ingested threads as though this anon had
                        written them, which was not true of any of them. Same
                        treatment as the saved tab below. */}
                    <TabsContent value="posts">
                        <EmptyState
                            icon={<PencilLine />}
                            title="No posts yet"
                            body="Threads you start appear here in bump order."
                        />
                    </TabsContent>

                    <TabsContent value="comments">
                        <ProfileCommentList comments={PROFILE_COMMENTS} />
                    </TabsContent>

                    <TabsContent value="media">
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
                            {PROFILE_MEDIA.map((media) => (
                                <MediaPlaceholder
                                    key={media}
                                    label={media}
                                    height={150}
                                />
                            ))}
                        </div>
                    </TabsContent>

                    {/* Saves live on /bookmarks, which is a real screen with
                        real data. This tab is about saves surfaced on the
                        profile, which nothing writes to, so it stays empty
                        and sends the anon to the page that holds them. */}
                    <TabsContent value="saved">
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
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}
