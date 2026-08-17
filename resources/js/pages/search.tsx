import { Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    ChevronRightIcon,
    SearchIcon,
    XIcon,
} from 'lucide-react';
import { useId, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { BoardAvatar } from '@/components/clover/board-avatar';
import { CommentResultRow } from '@/components/clover/comment-result-row';
import { EmptyState } from '@/components/clover/empty-state';
import { MachineValue } from '@/components/clover/machine-value';
import { PageMeta } from '@/components/clover/page-meta';
import { PatternField } from '@/components/clover/pattern-field';
import { SearchFilterMenu } from '@/components/clover/search-filter-menu';
import { SearchResultsList } from '@/components/clover/search-results-list';
import { SearchTabs } from '@/components/clover/search-tabs';
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
import {
    SEARCH_SORT_LABELS,
    SEARCH_TIMES,
    SEARCH_TIME_LABELS,
    SEARCH_TYPE_LABELS,
    searchUrl,
    sortOptionsFor,
    timeAppliesTo,
} from '@/lib/search-params';
import type { SearchSort, SearchTime, SearchType } from '@/lib/search-params';
import { board as boardRoute } from '@/routes';
import type { Board, CommentResult, Thread } from '@/types/clover';

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
    /**
     * The three URL controls, as the server resolved them — not as the URL
     * spells them. An unknown `type`, or a sort the tab cannot apply, falls
     * back there rather than erroring, and these are what the results in hand
     * were actually produced with. Drawing the tabs from the URL instead
     * would mark `?type=videos` as the current tab over a list of everything.
     */
    type: SearchType;
    sort: SearchSort;
    time: SearchTime;
    boards: Board[];
    threads: Thread[];
    /** Replies. Never opening posts — those are the Posts tab's rows. */
    comments: CommentResult[];
    /**
     * The same busiest-boards query `SearchController::suggest` runs for an
     * empty query, sent once as a prop rather than fetched again on
     * arrival — the suggestions screen's second source, below `md`.
     */
    busiestBoards: Board[];
}

export default function Search({
    query,
    type,
    sort,
    time,
    boards,
    threads,
    comments,
    busiestBoards,
}: SearchProps) {
    const { auth } = usePage().props;
    const { toggleBookmark, authGate } = useBookmark();

    const total = boards.length + threads.length + comments.length;

    /**
     * The mobile field's own live text, seeded from the URL so a search
     * already submitted (`/search?q=foo`) shows what was searched rather
     * than an empty box. Distinct from `query` above: that is what the
     * server rendered results for, this is what is in the box right now,
     * and they only agree until the next keystroke.
     */
    const [mobileQuery, setMobileQuery] = useState(query);
    const listId = useId();
    const fieldRef = useRef<HTMLInputElement>(null);

    /**
     * Whether this screen is offering suggestions rather than results.
     *
     * Two ways in: arriving with no query at all, and emptying the field with
     * the clear control. The second is why this is not simply `query === ''` —
     * clearing the box returns an anon to where they started, which is the
     * recent searches and the busiest boards, rather than leaving results for
     * a term no longer on screen. It only governs what shows below `md`: at
     * `md` and up the field belongs to the header and the results stay put.
     */
    const suggesting = query === '' || mobileQuery.trim() === '';

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
        /* Same gate as the header field: a signed-out anon's terms are not
           recorded. See `runSearch`. */
        runSearch(term, { signedIn: Boolean(auth.user) });
    }

    /**
     * A control changed: same query, same everything else, one value
     * different. A real visit rather than local state, because the tab, the
     * sort and the time are the URL and the server is what applies them —
     * and `searchUrl` drops whatever the destination cannot honour, so the
     * page never asks for an ordering it will then be told it did not get.
     */
    function refine(next: {
        type?: SearchType;
        sort?: SearchSort;
        time?: SearchTime;
    }): void {
        router.visit(searchUrl({ q: query, type, sort, time, ...next }));
    }

    /** The heading a section gets, and where it leads. See `ResultSection`. */
    function sectionHeading(section: SearchType): ReactNode {
        const label = SEARCH_TYPE_LABELS[section];

        if (type !== 'all') {
            return <SectionLabel>{label}</SectionLabel>;
        }

        return (
            <Link
                href={searchUrl({ q: query, type: section, sort, time })}
                /* Named apart from the tab of the same word above it. Two
                   links reading "Posts" on one screen is a list a screen
                   reader cannot tell apart, and this one means "the rest of
                   them" rather than "this tab". */
                aria-label={`All ${label.toLowerCase()}`}
                className="rounded-sm text-faint transition-colors duration-[var(--duration-hover)] ease-standard hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
                <SectionLabel
                    action={
                        <ChevronRightIcon
                            aria-hidden="true"
                            className="size-4"
                        />
                    }
                >
                    {label}
                </SectionLabel>
            </Link>
        );
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
                                ref={fieldRef}
                                type="search"
                                role="combobox"
                                /* Both of these describe the suggestions
                                   list, and follow it exactly: hardcoding
                                   `true` and pointing `aria-controls` at an
                                   id nothing carries told a screen reader
                                   there was an open listbox to move into on
                                   the results page, where there is not. The
                                   list is back once the field is cleared, so
                                   this tracks `suggesting` rather than the
                                   query the server answered. */
                                aria-expanded={suggesting}
                                aria-controls={suggesting ? listId : undefined}
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

                            {/* Clearing is not searching for nothing. It
                                empties the field and hands the screen back to
                                the suggestions it opened with, without a visit
                                -- an anon who has just deleted their query has
                                not asked for a page of results for the empty
                                string. Absent while there is nothing to
                                clear. */}
                            {mobileQuery !== '' ? (
                                <button
                                    type="button"
                                    aria-label="Clear search"
                                    onClick={() => {
                                        setMobileQuery('');
                                        fieldRef.current?.focus();
                                    }}
                                    className="touch-target-44 grid size-6 shrink-0 place-items-center rounded-full text-faint hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                >
                                    <XIcon
                                        aria-hidden="true"
                                        className="size-4"
                                    />
                                </button>
                            ) : null}
                        </div>
                    </div>
                </PatternField>
            </div>

            <div className="mx-auto flex w-full max-w-[820px] flex-col gap-6 px-6 py-8">
                {/* The suggestions screen below `md`: recent searches, then
                    the busiest boards or, once typed into, live matches —
                    exactly what the header dropdown already offers, nothing
                    this codebase has no source for. Shown while there is
                    nothing to show results for: an empty query on arrival, or
                    a field the anon has just cleared. A real query renders the
                    ordinary results below at every width instead. */}
                {suggesting ? (
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
                        suggesting
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

                {/* The tabs, then the two menus under them — the reference's
                    stack, and the order they read in: which results, then how
                    they are ordered and how far back they go. Only over a real
                    query: there is nothing to slice four ways on the
                    suggestions screen, and a row of filters over the busiest
                    boards would be four controls that change nothing. */}
                {query !== '' ? (
                    <div
                        className={
                            suggesting
                                ? 'hidden flex-col gap-3 md:flex'
                                : 'flex flex-col gap-3'
                        }
                    >
                        <SearchTabs
                            query={query}
                            type={type}
                            sort={sort}
                            time={time}
                        />

                        <div className="flex flex-wrap items-center gap-4">
                            <SearchFilterMenu
                                name="Sort by"
                                value={sort}
                                options={sortOptionsFor(type).map((value) => ({
                                    value,
                                    label: SEARCH_SORT_LABELS[value],
                                }))}
                                onSelect={(chosen) => refine({ sort: chosen })}
                            />

                            {/* Absent on Communities rather than present and
                                inert: a board's only date here is when this
                                mirror first synced it, which says nothing
                                about the board. */}
                            {timeAppliesTo(type) ? (
                                <SearchFilterMenu
                                    name="Time"
                                    value={time}
                                    options={SEARCH_TIMES.map((value) => ({
                                        value,
                                        label: SEARCH_TIME_LABELS[value],
                                    }))}
                                    onSelect={(chosen) =>
                                        refine({ time: chosen })
                                    }
                                />
                            ) : null}
                        </div>
                    </div>
                ) : null}

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
                        body={`Nothing on Clover matches "${query}" on this tab. Only synced boards, threads and replies are searchable.`}
                        className={suggesting ? 'hidden md:flex' : undefined}
                    />
                ) : null}

                {/* Posts, Communities, Comments — the tab order, so the All
                    tab reads as the tabs above it do. */}
                {threads.length > 0 ? (
                    <section className="flex flex-col gap-3">
                        {sectionHeading('posts')}
                        <div className="flex flex-col">
                            {threads.map((thread) => (
                                <ThreadCard
                                    key={thread.id}
                                    thread={thread}
                                    mediaLayout="thumbnail"
                                    onBookmark={() => toggleBookmark(thread)}
                                />
                            ))}
                        </div>
                    </section>
                ) : null}

                {boards.length > 0 ? (
                    <section className="flex flex-col gap-3">
                        {sectionHeading('communities')}
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

                {comments.length > 0 ? (
                    <section className="flex flex-col gap-3">
                        {sectionHeading('comments')}
                        <div className="flex flex-col">
                            {comments.map((comment) => (
                                <CommentResultRow
                                    key={comment.id}
                                    comment={comment}
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
