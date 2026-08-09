import { Head, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { AuthGate } from '@/components/clover/auth-gate';
import { MachineValue } from '@/components/clover/machine-value';
import { Pagination } from '@/components/clover/pagination';
import { ThreadCard } from '@/components/clover/thread-card';
import { ThreadSkeleton } from '@/components/clover/thread-skeleton';
import { AnonBanner } from '@/components/feed/anon-banner';
import { Rail } from '@/components/feed/rail';
import { Button } from '@/components/ui/button';
import { THREADS } from '@/fixtures/clover';

/**
 * The feed, in three sorts. The server decides which by the route it renders
 * (`dashboard`, `popular` or `latest`) and passes the result as `sort` rather
 * than the page reading it back out of the URL, so there is exactly one
 * source of truth for which sort is active.
 */
type Sort = 'bumped' | 'popular' | 'latest';

const HEADINGS: Record<Sort, string> = {
    bumped: 'Home',
    popular: 'Popular',
    latest: 'Latest',
};

/**
 * The prototype's copy names the bump-order case explicitly; the other two
 * sorts carry the same "anons online" stat with a description of their own
 * ordering, since the online count is a site-wide figure rather than
 * something that changes with the sort.
 */
const SORT_DESCRIPTIONS: Record<Sort, string> = {
    bumped: 'Sorted by bump order',
    latest: 'Sorted by newest first',
    popular: 'Sorted by most blessed',
};

const ONLINE_COUNT = '228,025';

/**
 * The three sort tabs, in the order the prototype lists them. Each is a link
 * to a real route rather than a local toggle: the prototype let its tabs and
 * the URL's sort disagree, which is a bug, not a feature, so here the tab a
 * screen reader or the browser's back button reports is always the one that
 * is actually showing.
 */
/**
 * A blessing the anon has added optimistically, held here because there is no
 * backend to hold it. The page feeds `ThreadCard` both an adjusted
 * `thread.blessings` and a `voteState`, so the press is signalled by
 * `aria-pressed` and not only by the count moving.
 */
type BlessDelta = 0 | 1;

export default function Feed({ sort }: { sort: Sort }) {
    const { auth } = usePage().props;
    const signedIn = Boolean(auth.user);

    const [blessed, setBlessed] = useState<Record<number, BlessDelta>>({});
    /* Signed-out anons get the gate rather than a redirect: sending them to
       /login throws away their place in the feed to answer a question they may
       not want to answer yet. Matches the thread page. */
    const [gatedAction, setGatedAction] = useState<string | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);

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

    /**
     * There is no backend yet, so "loading more" is simulated with a timeout
     * rather than a real request. The skeletons disappear and the button
     * re-enables once it resolves.
     */
    function handleLoadMore() {
        setLoadingMore(true);

        setTimeout(() => {
            setLoadingMore(false);
        }, 1000);
    }

    return (
        <>
            <Head title={HEADINGS[sort]} />

            <div className="mx-auto flex w-full max-w-[1180px] gap-7 px-6 py-6">
                <div
                    data-slot="feed-column"
                    className="flex max-w-[760px] min-w-0 flex-1 flex-col gap-5"
                >
                    <div className="flex flex-col gap-1">
                        <h1 className="font-display text-h1 font-semibold text-foreground">
                            {HEADINGS[sort]}
                        </h1>
                        <MachineValue>
                            {SORT_DESCRIPTIONS[sort]} &middot; {ONLINE_COUNT}{' '}
                            anons online
                        </MachineValue>
                    </div>

                    {signedIn ? null : <AnonBanner />}

                    <div className="flex flex-col gap-4">
                        {THREADS.map((thread) => (
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

                        {loadingMore ? (
                            <>
                                <ThreadSkeleton />
                                <ThreadSkeleton />
                            </>
                        ) : null}
                    </div>

                    <Button
                        variant="outline"
                        disabled={loadingMore}
                        onClick={handleLoadMore}
                        className="self-center"
                    >
                        {loadingMore ? 'Loading' : 'Load more threads'}
                    </Button>

                    <Pagination
                        page={page}
                        pageCount={5}
                        onChange={setPage}
                        className="justify-center self-center"
                    />
                </div>

                <div className="hidden w-[330px] shrink-0 lg:block">
                    <Rail />
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
