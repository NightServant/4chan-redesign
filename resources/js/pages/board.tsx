import { Head, Link } from '@inertiajs/react';
import { CompassIcon } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/clover/empty-state';
import { ThreadCard } from '@/components/clover/thread-card';
import { BoardHeader } from '@/components/feed/board-header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BOARDS, THREADS } from '@/fixtures/clover';
import { popular } from '@/routes';
import type { BoardSlug, Thread } from '@/types/clover';

type SortOption = 'bumped' | 'new' | 'blessed';

const SORT_TABS: ReadonlyArray<{ value: SortOption; label: string }> = [
    { value: 'bumped', label: 'Recently bumped' },
    { value: 'new', label: 'New' },
    { value: 'blessed', label: 'Most blessed' },
];

/**
 * Orders a board's threads for a sort tab.
 *
 * `bumped` keeps fixture order, which already runs most-recently-active
 * first. `new` falls back to post number, since higher numbers are strictly
 * newer posts. `blessed` orders by blessing count. There is no per-sort
 * board URL, so this is local state on the page rather than a route param.
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
    slug: BoardSlug;
};

export default function Board({ slug }: BoardProps) {
    const [sort, setSort] = useState<SortOption>('bumped');

    const board = BOARDS.find((candidate) => candidate.slug === slug);
    const threads = THREADS.filter((thread) => thread.board === slug);

    /**
     * The route constrains `slug` to a known board, so this never renders
     * for a real request. It only guards the type of `board.find`, which is
     * `Board | undefined`, without a non-null assertion.
     */
    if (!board) {
        return null;
    }

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
