import { Head, Link, usePage } from '@inertiajs/react';
import { CompassIcon } from 'lucide-react';
import { useState } from 'react';
import { AuthGate } from '@/components/clover/auth-gate';
import { EmptyState } from '@/components/clover/empty-state';
import { PageHeader } from '@/components/clover/page-header';
import { ThreadCard } from '@/components/clover/thread-card';
import { AnonBanner } from '@/components/feed/anon-banner';
import { Rail } from '@/components/feed/rail';
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

/**
 * A blessing the anon has added optimistically, held here because there is no
 * backend to hold it. The page feeds `ThreadCard` both an adjusted
 * `thread.blessings` and a `voteState`, so the press is signalled by
 * `aria-pressed` and not only by the count moving.
 */
type BlessDelta = 0 | 1;

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

    const [blessed, setBlessed] = useState<Record<number, BlessDelta>>({});
    /* Signed-out anons get the gate rather than a redirect: sending them to
       /login throws away their place in the feed to answer a question they may
       not want to answer yet. Matches the thread page. */
    const [gatedAction, setGatedAction] = useState<string | null>(null);

    function toggleBless(threadNo: number) {
        if (!signedIn) {
            setGatedAction('bless a thread');

            return;
        }

        setBlessed((current) => ({
            ...current,
            [threadNo]: current[threadNo] ? 0 : 1,
        }));
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

                    <div className="flex flex-col gap-4">
                        {threads.map((thread) => (
                            <ThreadCard
                                key={thread.no}
                                thread={{
                                    ...thread,
                                    blessings:
                                        thread.blessings +
                                        (blessed[thread.no] ?? 0),
                                }}
                                voteState={
                                    blessed[thread.no] ? 'blessed' : null
                                }
                                onBless={() => toggleBless(thread.no)}
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
