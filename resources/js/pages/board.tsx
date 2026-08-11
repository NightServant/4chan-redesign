import { Head, Link } from '@inertiajs/react';
import { CompassIcon } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/clover/empty-state';
import { ThreadCard } from '@/components/clover/thread-card';
import { BoardHeader } from '@/components/feed/board-header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { popular } from '@/routes';
import type { Board as BoardType, Thread } from '@/types/clover';

type SortOption = 'bumped' | 'new' | 'blessed';

const SORT_TABS: ReadonlyArray<{ value: SortOption; label: string }> = [
    { value: 'bumped', label: 'Recently bumped' },
    { value: 'new', label: 'New' },
    { value: 'blessed', label: 'Most blessed' },
];

/**
 * Orders a board's threads for a sort tab.
 *
 * `bumped` is the order the server sent, which is bump order — it is returned
 * untouched rather than re-derived, because the client has no field that
 * reproduces `bumped_at` and a second sort here could only disagree with the
 * query. `new` falls back to post number, since higher numbers are strictly
 * newer posts. `blessed` orders by blessing count, which is every thread's
 * zero until task 11b builds voting, so that tab currently returns bump order
 * too — a stable sort leaves equal keys alone.
 *
 * There is no per-sort board URL, so this stays local state on the page rather
 * than a route param.
 */
function sortThreads(threads: readonly Thread[], sort: SortOption): Thread[] {
    const sorted = [...threads];

    if (sort === 'blessed') {
        sorted.sort((a, b) => b.blessings - a.blessings);
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
    const [sort, setSort] = useState<SortOption>('bumped');

    const slug = board.slug;

    return (
        <>
            <Head title={board.name} />

            <div className="mx-auto flex max-w-[760px] flex-col gap-6 px-6 py-8">
                <BoardHeader board={board} />

                <Tabs
                    value={sort}
                    onValueChange={(value) => setSort(value as SortOption)}
                >
                    <TabsList aria-label="Sort threads">
                        {SORT_TABS.map((tab) => (
                            <TabsTrigger key={tab.value} value={tab.value}>
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
                                            />
                                        ),
                                    )}
                                </div>
                            )}
                        </TabsContent>
                    ))}
                </Tabs>
            </div>
        </>
    );
}
