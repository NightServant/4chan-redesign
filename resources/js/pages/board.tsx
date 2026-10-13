import { Link, router } from '@inertiajs/react';
import { CompassIcon } from 'lucide-react';
import { EmptyState } from '@/components/clover/empty-state';
import { PageMeta } from '@/components/clover/page-meta';
import { PagedList } from '@/components/clover/paged-list';
import { ThreadCard } from '@/components/clover/thread-card';
import { BoardHeader } from '@/components/feed/board-header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBookmark } from '@/hooks/use-bookmark';
import { board as boardRoute, popular } from '@/routes';
import type { Board as BoardType, Paged, Thread } from '@/types/clover';

type SortOption = 'bumped' | 'new' | 'replies';

const SORT_TABS: ReadonlyArray<{ value: SortOption; label: string }> = [
    { value: 'bumped', label: 'Recently bumped' },
    { value: 'new', label: 'New' },
    { value: 'replies', label: 'Most replies' },
];

/**
 * The tabs are the server's orderings, not a re-sort of what has loaded.
 *
 * Each is a visit to `/{board}?sort=...` and the database orders the whole
 * board: "Most replies" is the board's most-replied threads on its first page
 * and carries on down from there on the next, which a client-side sort of
 * whichever pages happened to be loaded could not claim. A visit also resets
 * the scroll list, so a cursor from one ordering is never used with another.
 */
type BoardProps = {
    /** Carries the board's description, which only this page renders. */
    board: BoardType & { description: string };
    /** The ordering `threads` was produced with, as the server resolved it. */
    sort: SortOption;
    /**
     * The board's threads, in the order `sort` names. Every page that has
     * loaded is in here, appended in the order the server sent them.
     */
    threads: Paged<Thread>;
    /** This board's own `max_comment_chars`, not a global constant. */
    maxCommentChars: number;
};

/**
 * The board resolves server-side now, so there is no longer a "slug matched
 * nothing" branch to guard: a slug with no board behind it 404s in the
 * controller rather than reaching a component that returns null. That branch
 * was how a routable slug with no data rendered a blank page.
 */
export default function Board({ board, sort, threads: paged }: BoardProps) {
    const threads = paged.data;
    const { toggleBookmark, authGate } = useBookmark({ keepsPages: true });

    const slug = board.slug;

    return (
        <>
            <PageMeta
                title={`${board.slug} — ${board.name}`}
                description={`${board.name} on Clover. ${board.description}`}
            />

            <div className="mx-auto flex max-w-(--measure-media) flex-col gap-6 px-6 py-8">
                <BoardHeader board={board} />

                <Tabs
                    value={sort}
                    onValueChange={(value) =>
                        router.visit(
                            boardRoute.url(
                                slug.replaceAll('/', ''),
                                value === 'bumped'
                                    ? undefined
                                    : { query: { sort: value } },
                            ),
                        )
                    }
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

                    <TabsContent value={sort}>
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
                            <PagedList
                                data="threads"
                                className="flex flex-col gap-4"
                            >
                                {threads.map((thread) => (
                                    <ThreadCard
                                        key={thread.no}
                                        thread={thread}
                                        onBookmark={() =>
                                            toggleBookmark(thread)
                                        }
                                    />
                                ))}
                            </PagedList>
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {authGate}
        </>
    );
}
