import { router } from '@inertiajs/react';
import { Eraser, History as HistoryIcon, Search } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/clover/empty-state';
import { HistoryEntryList } from '@/components/clover/history-entry-list';
import { PageHeader } from '@/components/clover/page-header';
import { PageMeta } from '@/components/clover/page-meta';
import { Pagination } from '@/components/clover/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBookmark } from '@/hooks/use-bookmark';
import { destroy as clearHistory } from '@/routes/history';
import type { HistoryEntry } from '@/types/clover';

const PAGE_SIZE = 8;

function matches(entry: HistoryEntry, query: string): boolean {
    const needle = query.trim().toLowerCase();

    if (needle === '') {
        return true;
    }

    return (
        entry.thread.title.toLowerCase().includes(needle) ||
        entry.thread.board.toLowerCase().includes(needle)
    );
}

/**
 * Threads this anon opened, drawn the way the feed draws threads.
 *
 * ## Why it is the feed's card now
 *
 * It had a card of its own: a row built from a title, a board and a post
 * number that the controller had flattened by hand. So a history of threads
 * looked nothing like the threads it was a history of, and the two drifted —
 * the feed's row grew a bookmark control, an NSFW mark, and reply and image
 * counts, and none of it reached here.
 *
 * The server sends the same `ThreadResource` the feed gets, so this renders
 * the same `ThreadCard`, and anything added to a thread arrives on both
 * screens at once instead of on whichever one somebody remembered.
 *
 * What history knows and the feed does not is when this anon was last on a
 * thread. That is what the card's `meta` slot carries.
 *
 * The day-grouped rendering of that card lives in `HistoryEntryList` now,
 * not here: the account screen's History tab needs the same grouped list
 * below `md`, and a second copy of it is the same defect the paragraph above
 * describes, one level up.
 *
 * ## What went
 *
 * The sort control. It offered "Most recent" and "Least finished", and the
 * function behind it returned the list unchanged for both — `sortEntries` took
 * the entries, copied the array and handed it back. "Least finished" could not
 * have worked in any case: it sorts on reading progress, which was removed in
 * task 17 because nothing has ever measured it.
 */
type HistoryProps = {
    /** One entry per thread, most recently read first. */
    entries: HistoryEntry[];
};

export default function History({ entries }: HistoryProps) {
    const { toggleBookmark, authGate } = useBookmark();
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);

    const matched = entries.filter((entry) => matches(entry, query));

    const pageCount = Math.max(1, Math.ceil(matched.length / PAGE_SIZE));
    const current = Math.min(page, pageCount);
    const visible = matched.slice(
        (current - 1) * PAGE_SIZE,
        current * PAGE_SIZE,
    );

    function clearAll(): void {
        router.delete(clearHistory().url);
    }

    const searching = query.trim() !== '';

    return (
        <>
            <PageMeta
                title="History"
                description="Threads you opened on Clover, most recent first."
            />

            <div className="mx-auto flex w-full max-w-(--measure-media) flex-col gap-[18px] px-6 py-6">
                <PageHeader
                    title="History"
                    description="Threads you opened, most recent first."
                    action={
                        <Button
                            variant="ghost"
                            onClick={clearAll}
                            disabled={entries.length === 0}
                        >
                            <Eraser aria-hidden="true" />
                            Clear all
                        </Button>
                    }
                />

                <div className="relative">
                    <Search
                        aria-hidden="true"
                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint"
                    />
                    <Input
                        type="search"
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setPage(1);
                        }}
                        aria-label="Search your history"
                        placeholder="Search your history"
                        className="pl-9"
                    />
                </div>

                {visible.length === 0 ? (
                    <EmptyState
                        icon={<HistoryIcon />}
                        title="No history to show"
                        body={
                            searching
                                ? `Nothing matches "${query}".`
                                : 'Threads you open appear here so you can pick them back up.'
                        }
                    />
                ) : (
                    <div className="flex flex-col gap-5">
                        <HistoryEntryList
                            entries={visible}
                            onBookmark={(thread) => toggleBookmark(thread)}
                        />

                        {pageCount > 1 ? (
                            <Pagination
                                page={current}
                                pageCount={pageCount}
                                onChange={setPage}
                                className="justify-center"
                            />
                        ) : null}
                    </div>
                )}
            </div>

            {authGate}
        </>
    );
}
