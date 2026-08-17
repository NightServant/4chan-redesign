import { Link } from '@inertiajs/react';
import {
    Bookmark,
    History as HistoryIcon,
    ImageIcon,
    LogOutIcon,
    MessageSquare,
    ShieldIcon,
} from 'lucide-react';
import { ProfileCommentList } from '@/components/account/profile-comment-list';
import { ProfileHeader } from '@/components/account/profile-header';
import { EmptyState } from '@/components/clover/empty-state';
import { HistoryEntryList } from '@/components/clover/history-entry-list';
import { PageMeta } from '@/components/clover/page-meta';
import { PostAttachment } from '@/components/clover/post-image';
import { ThreadCard } from '@/components/clover/thread-card';
import { MatureBoardsToggle } from '@/components/settings/mature-boards-toggle';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBookmark } from '@/hooks/use-bookmark';
import { bookmarks, history as historyRoute, logout } from '@/routes';
import { edit as editTwoFactor } from '@/routes/two-factor';
import type {
    Attachment,
    HistoryEntry,
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
 * Three tabs, not five, at `md` and up. Four below it.
 *
 * "Overview" and "Posts" went. Overview was a summary of the tabs beside it —
 * a recent-activity list and a "top thread" panel that read "No threads yet"
 * on any account that had not started one, which is every account, because
 * Clover accepts no new threads. Posts listed the same threads that panel was
 * empty about.
 *
 * What is left is what an anon actually has here: what they wrote, what they
 * attached to it, and what they saved — plus, below `md`, what they read.
 * History is not in this array: it renders separately, `md:hidden`, since
 * nothing else here is conditional on the viewport and folding it into the
 * same `.map()` would hide that one row's gating among three that have none.
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
    /** Attachments on their own posts, newest first. */
    media: Attachment[];
    /** Threads they saved, as full cards. */
    saved: Thread[];
    /**
     * Threads they read, most recent first, capped at
     * `AccountController::HISTORY`. Read only below `md`: at `md` and up
     * `/history` is its own page, uncapped, reached from the avatar menu.
     */
    history: HistoryEntry[];
};

export default function Account({
    profile,
    stats,
    comments,
    media,
    saved,
    history,
}: AccountProps) {
    const { toggleBookmark, authGate } = useBookmark();

    return (
        <>
            <PageMeta
                title="Account"
                description="Your replies, the images you attached to them, and the threads you saved."
            />

            <div className="mx-auto flex w-full max-w-(--measure-page) flex-col gap-5 px-6 py-6">
                <ProfileHeader profile={profile} stats={stats} />

                <Tabs defaultValue="comments">
                    <TabsList aria-label="Profile sections">
                        {TABS.map((tab) => (
                            <TabsTrigger key={tab.value} value={tab.value}>
                                {tab.label}
                            </TabsTrigger>
                        ))}
                        {/* At `md` and up `/history` is its own page, reached
                            from the avatar menu, and this tab does not exist
                            there — the tab and its content both carry
                            `md:hidden` so neither survives a resize while
                            active. */}
                        <TabsTrigger value="history" className="md:hidden">
                            History
                        </TabsTrigger>
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
                        {/* Their own uploads, shown as the pictures they are.
                            This rendered a `MediaPlaceholder` per label — a
                            grey box with a filename in it — because the server
                            sent label strings rather than attachments. It was
                            built that way when Clover accepted no files and
                            stayed that way after replies could carry one. */}
                        {media.length === 0 ? (
                            <EmptyState
                                icon={<ImageIcon />}
                                title="No media yet"
                                body="Images you attach to a reply appear here."
                            />
                        ) : (
                            /* `min(220px,100%)`, not a bare 220px minimum —
                               see board-directory.tsx for the overflow this
                               produces at a 320px viewport. */
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(220px,100%),1fr))] gap-3">
                                {media.map((attachment) => (
                                    <PostAttachment
                                        key={attachment.fullUrl}
                                        media={attachment}
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

                    {/* Below `md` only. `/history` sends every read with no
                        limit; this is capped server-side
                        (`AccountController::HISTORY`) because every client
                        pays for these rows whether or not it ever renders
                        the tab, and the tab is `md:hidden` -- invisible to
                        the server deciding how many rows to send. */}
                    <TabsContent value="history" className="md:hidden">
                        {history.length === 0 ? (
                            <EmptyState
                                icon={<HistoryIcon />}
                                title="No history yet"
                                body="Threads you open appear here, most recent first."
                                action={
                                    <Button variant="outline" asChild>
                                        <Link href={historyRoute()}>
                                            Open history
                                        </Link>
                                    </Button>
                                }
                            />
                        ) : (
                            <div className="flex flex-col gap-4">
                                <HistoryEntryList
                                    entries={history}
                                    onBookmark={(thread) =>
                                        toggleBookmark(thread)
                                    }
                                />

                                {/* The tab is always capped, so there is
                                    always potentially "the rest" once it has
                                    anything in it at all -- unlike the Saved
                                    tab's link, which only has somewhere to
                                    send an anon once the tab is empty. */}
                                <Button
                                    variant="ghost"
                                    asChild
                                    className="self-start"
                                >
                                    <Link href={historyRoute()}>
                                        View full history
                                    </Link>
                                </Button>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                {/* What the avatar dropdown carried that has nowhere else to
                    go once it is hidden below `md` (see `app-header.tsx`).
                    `Show adult boards` reuses the same `MatureBoardsToggle`
                    `/settings` renders rather than a third copy of the
                    control; `Two-factor authentication` and `Sign out` are
                    new here -- the dropdown was the only route to either of
                    them, and it does not exist below `md` any more. Hidden
                    at `md` and up, where the dropdown still carries all
                    three. */}
                <section
                    aria-label="Account settings"
                    className="flex flex-col gap-4 border-t border-border pt-5 md:hidden"
                >
                    <MatureBoardsToggle />

                    <Button
                        variant="outline"
                        asChild
                        className="w-full justify-start gap-3"
                    >
                        <Link href={editTwoFactor()}>
                            <ShieldIcon aria-hidden="true" />
                            Two-factor authentication
                        </Link>
                    </Button>

                    {/* A POST, not a navigation -- `as="button"` keeps it a
                        real submitting control, exactly as the dropdown's
                        own row has it, rather than a plain link a signed-in
                        anon could bookmark or share. */}
                    <Button
                        variant="danger"
                        asChild
                        className="w-full justify-start gap-3"
                    >
                        <Link href={logout()} as="button">
                            <LogOutIcon aria-hidden="true" />
                            Sign out
                        </Link>
                    </Button>
                </section>
            </div>

            {authGate}
        </>
    );
}
