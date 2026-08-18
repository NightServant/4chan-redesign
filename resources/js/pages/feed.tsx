import { Link, usePage } from '@inertiajs/react';
import { CompassIcon } from 'lucide-react';
import { EmptyState } from '@/components/clover/empty-state';
import { PageHeader } from '@/components/clover/page-header';
import { PageMeta } from '@/components/clover/page-meta';
import { ThreadCard } from '@/components/clover/thread-card';
import { AnonBanner } from '@/components/feed/anon-banner';
import { Rail } from '@/components/feed/rail';
import type { FeedLibrary } from '@/components/feed/rail';
import { Button } from '@/components/ui/button';
import { useBookmark } from '@/hooks/use-bookmark';
import { communities } from '@/routes';
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
    /* Was "Sorted by most blessed", which outlived blessings by five tasks.
       The query orders by reply count and always has. */
    popular: 'Sorted by most replies',
};

/**
 * The same three sorts, written for someone who has not seen the page — a
 * search result, or a link somebody pasted. The line above is for a reader who
 * is already looking at the feed and needs only to know how it is ordered.
 */
const META_DESCRIPTIONS: Record<Sort, string> = {
    bumped: 'Threads from every board Clover mirrors, in bump order. No account needed to read.',
    latest: 'The newest threads across every board Clover mirrors. No account needed to read.',
    popular:
        'The most-replied threads across every board Clover mirrors. No account needed to read.',
};

type FeedProps = {
    sort: Sort;
    /** What Clover holds, counted server-side for the rail. */
    library: FeedLibrary;
    /** Already ordered for `sort`. Rendered in the order given. */
    threads: Thread[];
};

export default function Feed({ sort, threads, library }: FeedProps) {
    const { toggleBookmark, authGate } = useBookmark();
    const { auth } = usePage().props;
    const signedIn = Boolean(auth.user);

    return (
        <>
            <PageMeta
                title={HEADINGS[sort]}
                description={META_DESCRIPTIONS[sort]}
            />

            <div className="mx-auto flex w-full max-w-(--measure-page) gap-7 px-6 py-6">
                <div
                    data-slot="feed-column"
                    /* `--measure-media`, the same token the attachment box
                       is capped at. At `--measure-column` the column ran to
                       760px while the image stopped at 560, so every card
                       ended in 200px of empty paper -- the gap Gabe kept
                       pointing at. */
                    className="flex max-w-(--measure-media) min-w-0 flex-1 flex-col gap-5"
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
                                key={thread.id}
                                thread={thread}
                                onBookmark={() => toggleBookmark(thread)}
                            />
                        ))}
                    </div>
                </div>

                <div className="hidden w-(--measure-rail) shrink-0 lg:block">
                    <Rail library={library} threads={threads} />
                </div>
            </div>

            {authGate}
        </>
    );
}
