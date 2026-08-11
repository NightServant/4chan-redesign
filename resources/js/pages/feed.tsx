import { Head, Link, router, usePage } from '@inertiajs/react';
import { CompassIcon } from 'lucide-react';
import { useState } from 'react';
import { AuthGate } from '@/components/clover/auth-gate';
import { EmptyState } from '@/components/clover/empty-state';
import { PageHeader } from '@/components/clover/page-header';
import { ThreadCard } from '@/components/clover/thread-card';
import { AnonBanner } from '@/components/feed/anon-banner';
import { Rail } from '@/components/feed/rail';
import { Button } from '@/components/ui/button';
import { communities } from '@/routes';
import { vote as voteOnThread } from '@/routes/threads';
import type { Board, Thread, TrendingTag } from '@/types/clover';

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
    /** Already ordered for `sort`. Rendered in the order given. */
    threads: Thread[];
    /** The rail's board panel: the busiest boards, chosen server-side. */
    boards: Board[];
    /** The rail's trending panel, derived from real reply totals. */
    trending: TrendingTag[];
};

export default function Feed({ sort, threads, boards, trending }: FeedProps) {
    const { auth } = usePage().props;
    const signedIn = Boolean(auth.user);

    /* Signed-out anons get the gate rather than a redirect: sending them to
       /login throws away their place in the feed to answer a question they may
       not want to answer yet. Matches the thread page. */
    const [gatedAction, setGatedAction] = useState<string | null>(null);

    /**
     * The vote is stored, so the count and the pressed state come back from
     * the server rather than being held here. The optimistic copy this
     * replaced could disagree with the database the moment anyone else voted,
     * and had no way to find out.
     */
    function bless(thread: Thread) {
        if (!signedIn) {
            setGatedAction('bless a thread');

            return;
        }

        router.post(
            voteOnThread(thread.id).url,
            { value: 1 },
            { preserveScroll: true },
        );
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
                                voteState={thread.voteState}
                                onBless={() => bless(thread)}
                            />
                        ))}
                    </div>
                </div>

                <div className="hidden w-[330px] shrink-0 lg:block">
                    <Rail boards={boards} trending={trending} />
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
