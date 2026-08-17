import { Link } from '@inertiajs/react';
import { ArrowLeftIcon, SearchIcon } from 'lucide-react';
import { useId, useState, useSyncExternalStore } from 'react';
import { BoardAvatar } from '@/components/clover/board-avatar';
import { EmptyState } from '@/components/clover/empty-state';
import { MachineValue } from '@/components/clover/machine-value';
import { PageMeta } from '@/components/clover/page-meta';
import { PatternField } from '@/components/clover/pattern-field';
import { SearchResultsList } from '@/components/clover/search-results-list';
import { SectionLabel } from '@/components/clover/section-label';
import { ThreadCard } from '@/components/clover/thread-card';
import { useBookmark } from '@/hooks/use-bookmark';
import { useSearchSuggestions } from '@/hooks/use-search-suggestions';
import { runSearch } from '@/lib/run-search';
import {
    forgetSearch,
    searchHistoryServerSnapshot,
    searchHistorySnapshot,
    subscribeToSearchHistory,
} from '@/lib/search-history';
import { board as boardRoute } from '@/routes';
import type { Board, Thread } from '@/types/clover';

/**
 * Search results, for pressing Enter in the header field.
 *
 * The dropdown answers the common case; this is the URL worth sharing and the
 * place to see everything a query matched rather than the first handful.
 *
 * It searches this application's database, not 4chan: there is no search
 * endpoint upstream and a browser could not call one if there were.
 *
 * ## Below `md`: this is the suggestions screen too (task 6)
 *
 * `AppHeader`'s field visits here instead of opening its dropdown below
 * `md`, where a popover under a 164px control has no room to be useful.
 * Reddit's mobile search screen was the reference for the shape — a back
 * control, the field filling the row, suggestions beneath it — but not for
 * the content: Clover has no trending-topics feed, no interest signal and
 * no per-board blurb, so what renders here is exactly what the header's own
 * dropdown already shows from real sources — recent searches
 * (`search-history.ts`) and the busiest boards (`SearchController`) — and
 * nothing invented on top of it. An empty query is what makes this a
 * suggestions page rather than an empty results list; a real one still
 * renders the results below, unchanged, at every width.
 *
 * The app bar (back control + field) renders below `md` regardless of
 * query, not only for the bare suggestions page: `AppHeader` hides itself
 * below `md` for `/search` *and* `/search?q=...` alike, since it compares
 * by pathname, so a query-only app bar would strand a phone anon on the
 * results page with no way back and no way to search again.
 */
interface SearchProps {
    query: string;
    boards: Board[];
    threads: Thread[];
    /**
     * The same busiest-boards query `SearchController::suggest` runs for an
     * empty query, sent once as a prop rather than fetched again on
     * arrival — the suggestions screen's second source, below `md`.
     */
    busiestBoards: Board[];
}

export default function Search({
    query,
    boards,
    threads,
    busiestBoards,
}: SearchProps) {
    const { toggleBookmark, authGate } = useBookmark();

    const total = boards.length + threads.length;

    /**
     * The mobile field's own live text, seeded from the URL so a search
     * already submitted (`/search?q=foo`) shows what was searched rather
     * than an empty box. Distinct from `query` above: that is what the
     * server rendered results for, this is what is in the box right now,
     * and they only agree until the next keystroke.
     */
    const [mobileQuery, setMobileQuery] = useState(query);
    const listId = useId();

    const history = useSyncExternalStore(
        subscribeToSearchHistory,
        searchHistorySnapshot,
        searchHistoryServerSnapshot,
    );

    /**
     * Active only once there is something typed: the empty-query case is
     * already covered by `busiestBoards` above, sent with the page, so
     * fetching the identical answer again on arrival would be a wasted
     * round trip for data already in hand.
     */
    const { results: liveResults, loading } = useSearchSuggestions(
        mobileQuery,
        mobileQuery.trim() !== '',
    );

    const mobileResults =
        mobileQuery.trim() === ''
            ? { boards: busiestBoards, threads: [] }
            : liveResults;

    function submit(term: string): void {
        runSearch(term);
    }

    return (
        <>
            <PageMeta
                title={query === '' ? 'Search' : `${query} — search`}
                description={
                    query === ''
                        ? 'Search every thread Clover holds, by title and by body.'
                        : `Threads matching “${query}” across every board Clover mirrors.`
                }
            />

            {/* The app bar `AppHeader` steps aside for below `md` (see that
                component's own docblock). Styled to match it — sticky,
                `h-16`, the same paper — since an anon should not be able to
                tell the two apart. Unconditional on `query`: the header
                hides on `/search?q=...` too, so this has to cover both. */}
            <div className="sticky top-0 z-30 h-16 border-b border-border bg-bg md:hidden">
                <PatternField depth={0} feather={false} className="h-full">
                    <div className="mx-auto flex h-16 w-full max-w-(--measure-page) items-center gap-2 px-6">
                        <button
                            type="button"
                            aria-label="Back"
                            onClick={() => window.history.back()}
                            className="touch-target-44 flex size-9.5 shrink-0 items-center justify-center rounded-md text-foreground hover:bg-surface-hover"
                        >
                            <ArrowLeftIcon aria-hidden="true" />
                        </button>

                        {/* 44px on a coarse pointer, and the input stretches
                            to fill it -- this is the phone's search field, so
                            a row that grows while the only tappable thing in
                            it stays a ~20px strip of text would be the same
                            defect wearing a taller box. */}
                        <div className="flex h-9.5 w-full min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-surface px-3 focus-within:border-border-strong pointer-coarse:h-11">
                            <SearchIcon
                                aria-hidden="true"
                                className="size-4 shrink-0 text-faint"
                            />
                            <input
                                type="search"
                                role="combobox"
                                /* Both of these describe the suggestions
                                   list, which only renders while the
                                   server-side query is empty. Hardcoding
                                   `true` and pointing `aria-controls` at an
                                   id nothing carries told a screen reader
                                   there was an open listbox to move into on
                                   the results page, where there is not. */
                                aria-expanded={query === ''}
                                aria-controls={
                                    query === '' ? listId : undefined
                                }
                                aria-autocomplete="list"
                                aria-label="Search boards and threads"
                                placeholder="Search boards and threads"
                                value={mobileQuery}
                                /* On arrival at the suggestions screen only.
                                   Inertia remounts the page on each visit, so
                                   an unconditional `autoFocus` re-focused the
                                   field after a search was submitted and
                                   reopened the keyboard over the results the
                                   anon had just asked for. */
                                autoFocus={query === ''}
                                onChange={(event) =>
                                    setMobileQuery(event.target.value)
                                }
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        submit(mobileQuery);
                                    }
                                }}
                                className="h-full w-full min-w-0 self-stretch bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
                            />
                        </div>
                    </div>
                </PatternField>
            </div>

            <div className="mx-auto flex w-full max-w-[820px] flex-col gap-6 px-6 py-8">
                {/* The suggestions screen below `md`: recent searches, then
                    the busiest boards or, once typed into, live matches —
                    exactly what the header dropdown already offers, nothing
                    this codebase has no source for. Only for an empty
                    server-side query: a real one renders the ordinary
                    results below at every width instead. */}
                {query === '' ? (
                    <SearchResultsList
                        listId={listId}
                        query={mobileQuery}
                        loading={loading}
                        results={mobileResults}
                        history={history}
                        onSelectHistory={submit}
                        onForgetHistory={forgetSearch}
                        className="flex flex-col gap-1 md:hidden"
                    />
                ) : null}

                <div
                    className={
                        query === ''
                            ? 'hidden flex-col gap-2 md:flex'
                            : 'flex flex-col gap-2'
                    }
                >
                    <SectionLabel>Search</SectionLabel>
                    <h1 className="font-display text-h1 font-semibold text-foreground">
                        {query === ''
                            ? 'Search boards and threads'
                            : `Results for "${query}"`}
                    </h1>
                    {query !== '' ? (
                        <MachineValue>
                            {total} {total === 1 ? 'result' : 'results'}
                        </MachineValue>
                    ) : null}
                </div>

                {query === '' ? (
                    <EmptyState
                        icon={<SearchIcon />}
                        title="Nothing searched yet"
                        body="Search from the field in the header. Boards match on their slug, title and description; threads match on their subject and opening post."
                        className="hidden md:flex"
                    />
                ) : total === 0 ? (
                    <EmptyState
                        icon={<SearchIcon />}
                        title="No matches"
                        body={`Nothing on Clover matches "${query}". Only synced boards and threads are searchable.`}
                    />
                ) : null}

                {boards.length > 0 ? (
                    <section className="flex flex-col gap-3">
                        <SectionLabel>Boards</SectionLabel>
                        <ul className="flex flex-col divide-y divide-border border-y border-border">
                            {boards.map((board) => (
                                <li key={board.slug}>
                                    <Link
                                        href={boardRoute.url(
                                            board.slug.replaceAll('/', ''),
                                        )}
                                        className="flex items-center gap-3 py-3 hover:bg-surface-hover"
                                    >
                                        <BoardAvatar
                                            slug={board.slug}
                                            size={30}
                                            decorative
                                        />
                                        <span className="text-body-sm font-semibold text-foreground">
                                            {board.name}
                                        </span>
                                        <MachineValue className="ml-auto">
                                            {board.slug} · {board.threads}{' '}
                                            threads
                                        </MachineValue>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null}

                {threads.length > 0 ? (
                    <section className="flex flex-col gap-3">
                        <SectionLabel>Threads</SectionLabel>
                        <div className="flex flex-col gap-4">
                            {threads.map((thread) => (
                                <ThreadCard
                                    key={thread.no}
                                    thread={thread}
                                    onBookmark={() => toggleBookmark(thread)}
                                />
                            ))}
                        </div>
                    </section>
                ) : null}
            </div>

            {authGate}
        </>
    );
}
