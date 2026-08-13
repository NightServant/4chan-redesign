import { Head, Link, router, usePage } from '@inertiajs/react';
import { CompassIcon } from 'lucide-react';
import { useState } from 'react';
import { AuthGate } from '@/components/clover/auth-gate';
import { EmptyState } from '@/components/clover/empty-state';
import { PageHeader } from '@/components/clover/page-header';
import { ThreadCard } from '@/components/clover/thread-card';
import { AnonBanner } from '@/components/feed/anon-banner';
import { Rail } from '@/components/feed/rail';
import type { FeedLibrary } from '@/components/feed/rail';
import { Button } from '@/components/ui/button';
import { communities } from '@/routes';
import { bookmark as bookmarkThread } from '@/routes/threads';
import type { Thread } from '@/types/clover';

/**
 * The feed, in three sorts. The server decides which by the route it renders
 * (`dashboard`, `popular` or `latest`) and passes the result as `sort` rather
 * than the page reading it back out of the URL, so there is exactly one
 * source of truth for which sort is active.
 *
 * The threads themselves now arrive as a prop, already ordered by the server.
 * The page does not reorder them: `sort` names an ordering the database
 * applied, and a second sort here could only disagree with it.
 */
type Sort = 'bumped' | 'popular' | 'latest';

const HEADINGS: Record<Sort, string> = {
    bumped: 'Home',
    popular: 'Popular',
    latest: 'Latest',
};

/**
 * The description under each heading.
 *
 * These used to end with "· 228,025 anons online". That figure came from the
 * design prototype and nothing replaced it, because nothing could: 4chan's
 * JSON API publishes no online count, per board or site-wide. A number with no
 * source is not shown, so the line now says only what the sort is, which is
 * something the route genuinely knows.
 */
const SORT_DESCRIPTIONS: Record<Sort, string> = {
    bumped: 'Sorted by bump order',
    latest: 'Sorted by newest first',
    popular: 'Sorted by most blessed',
};

type FeedProps = {
    sort: Sort;
    /** What Clover holds, counted server-side for the rail. */
    library: FeedLibrary;
    /** Already ordered for `sort`. Rendered in the order given. */
    threads: Thread[];
};

export default function Feed({ sort, threads, library }: FeedProps) {
    const { auth } = usePage().props;
    const signedIn = Boolean(auth.user);

    /* Back, and with a caller this time. It was removed when blessings went
       because blessing was the only thing that opened it; bookmarking is now
       the thing that does. */
    const [gatedAction, setGatedAction] = useState<string | null>(null);

    /**
     * Saving a thread, which is the bug this fixes.
     *
     * `ThreadCard` has offered a bookmark button since it was written and no
     * page ever passed it a handler, so pressing it did nothing at all on
     * every feed, board and search result. The route and the table have
     * existed since task 11b; nothing was calling them.
     *
     * The request is a toggle and the server owns the answer, so this posts
     * and lets the reloaded prop set the pressed state rather than guessing
     * locally and drifting from the database.
     */
    function toggleBookmark(thread: Thread) {
        if (!signedIn) {
            setGatedAction('save a thread');

            return;
        }

        const request = thread.bookmarked ? router.delete : router.post;

        request(bookmarkThread(thread.id).url, { preserveScroll: true });
    }

    return (
        <>
            <Head title={HEADINGS[sort]} />

            <div className="mx-auto flex w-full max-w-[1180px] gap-7 px-6 py-6">
                <div
                    data-slot="feed-column"
                    className="flex max-w-[760px] min-w-0 flex-1 flex-col gap-5"
                >
                    <PageHeader
                        title={HEADINGS[sort]}
                        description={SORT_DESCRIPTIONS[sort]}
                    />

                    {signedIn ? null : <AnonBanner />}

                    {/* An empty feed is an ordinary state, not a failure: a
                        clone that has not run `clover:sync` yet has no threads
                        at all, and so does an anon whose content settings hide
                        every board that does. Without this the page renders a
                        heading over nothing and reads as broken. */}
                    {threads.length === 0 ? (
                        <EmptyState
                            icon={<CompassIcon />}
                            title="Nothing here yet"
                            body="No threads have been synced. Once boards are pulled in they appear here in bump order."
                            action={
                                <Button variant="outline" asChild>
                                    <Link href={communities()}>
                                        Browse boards
                                    </Link>
                                </Button>
                            }
                        />
                    ) : null}

                    <div className="flex flex-col gap-4">
                        {threads.map((thread) => (
                            <ThreadCard
                                key={thread.no}
                                thread={thread}
                                onBookmark={() => toggleBookmark(thread)}
                            />
                        ))}
                    </div>
                </div>

                <div className="hidden w-[330px] shrink-0 lg:block">
                    <Rail library={library} threads={threads} />
                </div>
            </div>

            <AuthGate
                action={gatedAction ?? 'do that'}
                open={gatedAction !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setGatedAction(null);
                    }
                }}
            />
        </>
    );
}
