import { Link } from '@inertiajs/react';
import { CompassIcon } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/clover/empty-state';
import { PageMeta } from '@/components/clover/page-meta';
import { ThreadCard } from '@/components/clover/thread-card';
import { BoardHeader } from '@/components/feed/board-header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBookmark } from '@/hooks/use-bookmark';
import { popular } from '@/routes';
import type { Board as BoardType, Thread } from '@/types/clover';

type SortOption = 'bumped' | 'new' | 'replies';

const SORT_TABS: ReadonlyArray<{ value: SortOption; label: string }> = [
    { value: 'bumped', label: 'Recently bumped' },
    { value: 'new', label: 'New' },
    { value: 'replies', label: 'Most replies' },
];

/**
 * Orders a board's threads for a sort tab.
 *
 * `bumped` is the order the server sent, which is bump order — it is returned
 * untouched rather than re-derived, because the client has no field that
 * reproduces `bumped_at` and a second sort here could only disagree with the
 * query. `new` falls back to post number, since higher numbers are strictly
 * newer posts. `replies` orders by reply count, which took the place of a
 * `blessed` tab: blessings were nought on almost every ingested thread, so
 * that tab returned bump order wearing a different name. Reply count is the
 * same signal the feed calls popular, and it is real for every row.
 *
 * There is no per-sort board URL, so this stays local state on the page rather
 * than a route param.
 */
function sortThreads(threads: readonly Thread[], sort: SortOption): Thread[] {
    const sorted = [...threads];

    if (sort === 'replies') {
        sorted.sort((a, b) => b.replies - a.replies);
    } else if (sort === 'new') {
        sorted.sort((a, b) => b.no - a.no);
    }

    return sorted;
}

type BoardProps = {
    /** Carries the board's description, which only this page renders. */
    board: BoardType & { description: string };
    /** The board's threads, already in bump order from the server. */
    threads: Thread[];
    /** This board's own `max_comment_chars`, not a global constant. */
    maxCommentChars: number;
};

/**
 * The board resolves server-side now, so there is no longer a "slug matched
 * nothing" branch to guard: a slug with no board behind it 404s in the
 * controller rather than reaching a component that returns null. That branch
 * was how a routable slug with no data rendered a blank page.
 */
export default function Board({ board, threads }: BoardProps) {
    const { toggleBookmark, authGate } = useBookmark();

    const [sort, setSort] = useState<SortOption>('bumped');

    const slug = board.slug;

    return (
        <>
            <PageMeta
                title={`${board.slug} — ${board.name}`}
                description={`${board.name} on Clover. ${board.description}`}
            />

            <div className="mx-auto flex max-w-(--measure-column) flex-col gap-6 px-6 py-8">
                <BoardHeader board={board} />

                <Tabs
                    value={sort}
                    onValueChange={(value) => setSort(value as SortOption)}
                >
                    {/* The row scrolls sideways rather than wrapping: three
                        labels do not fit a 320px phone, and a second line of
                        tabs under the first reads as two rows of controls
                        rather than one. `w-full` replaces `TabsList`'s own
                        `w-fit`, which sizes the row to its contents and so
                        can never overflow anything to scroll. Same treatment
                        task 7 gave the search tabs. */}
                    <TabsList
                        aria-label="Sort threads"
                        className="w-full overflow-x-auto"
                    >
                        {SORT_TABS.map((tab) => (
                            <TabsTrigger
                                key={tab.value}
                                value={tab.value}
                                className="shrink-0"
                            >
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {SORT_TABS.map((tab) => (
                        <TabsContent key={tab.value} value={tab.value}>
                            {threads.length === 0 ? (
                                <EmptyState
                                    icon={<CompassIcon />}
                                    title={`No threads on ${slug} yet`}
                                    body="Nothing has been posted to this board. Threads appear here in bump order once they are."
                                    action={
                                        <Button variant="outline" asChild>
                                            <Link href={popular.url()}>
                                                Browse popular threads
                                            </Link>
                                        </Button>
                                    }
                                />
                            ) : (
                                <div className="flex flex-col gap-4">
                                    {sortThreads(threads, tab.value).map(
                                        (thread) => (
                                            <ThreadCard
                                                key={thread.no}
                                                thread={thread}
                                                onBookmark={() =>
                                                    toggleBookmark(thread)
                                                }
                                            />
                                        ),
                                    )}
                                </div>
                            )}
                        </TabsContent>
                    ))}
                </Tabs>
            </div>

            {authGate}
        </>
    );
}
