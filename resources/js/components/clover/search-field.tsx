import { Link, router } from '@inertiajs/react';
import { Clock, Search, X } from 'lucide-react';
import {
    useCallback,
    useEffect,
    useId,
    useRef,
    useState,
    useSyncExternalStore,
} from 'react';
import { BoardAvatar } from '@/components/clover/board-avatar';
import { MachineValue } from '@/components/clover/machine-value';
import {
    forgetSearch,
    rememberSearch,
    searchHistoryServerSnapshot,
    searchHistorySnapshot,
    subscribeToSearchHistory,
} from '@/lib/search-history';
import { cn } from '@/lib/utils';
import { board as boardRoute, search as searchRoute } from '@/routes';
import type { Board, Thread } from '@/types/clover';

/**
 * Header search: a real input with a dropdown under it.
 *
 * It used to be a button dressed as a field, opening a command palette that
 * nothing mounted. Pressing it did nothing at all, which is the state this
 * replaces.
 *
 * ## What it searches
 *
 * This application's database. There is no search endpoint on 4chan — the API
 * is `boards.json`, `catalog.json` and a thread page — and a browser could not
 * call one if there were, since 4chan sends no CORS headers. What is searchable
 * is what has been synced, which is every board and eleven thousand threads.
 *
 * ## Why `fetch` rather than an Inertia visit
 *
 * A list that updates while an anon types is not a page visit: it must not push
 * history, must not replace the page under them, and must cancel the request
 * that is already in flight the moment another keystroke lands. That is a
 * debounce and an `AbortController`, which is what this is. Pressing Enter is a
 * navigation and goes through Inertia, because that one *is* a page visit.
 */
type Suggestions = {
    boards: Board[];
    threads: Thread[];
};

const EMPTY: Suggestions = { boards: [], threads: [] };

/** Long enough that a fast typist makes one request, not eight. */
const DEBOUNCE_MS = 180;

function boardHref(slug: string): string {
    return boardRoute.url(slug.replaceAll('/', ''));
}

export interface SearchFieldProps {
    placeholder?: string;
    className?: string;
}

export function SearchField({
    placeholder = 'Search boards and threads',
    className,
}: SearchFieldProps) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<Suggestions>(EMPTY);

    /**
     * What this anon searched for before, on this device.
     *
     * Subscribed rather than copied into state. `localStorage` fires no event
     * for the tab that wrote to it, so a component holding its own copy has to
     * remember to refresh it after every write — and the first version of this
     * did that by reading storage in an effect, which is a `setState` inside an
     * effect and a cascading render.
     *
     * `useSyncExternalStore` is what React provides for exactly this: the
     * store notifies, the component re-reads, and the server snapshot covers
     * the render where `localStorage` does not exist yet.
     */
    const history = useSyncExternalStore(
        subscribeToSearchHistory,
        searchHistorySnapshot,
        searchHistoryServerSnapshot,
    );

    const input = useRef<HTMLInputElement>(null);
    const wrapper = useRef<HTMLDivElement>(null);
    const listId = useId();

    /**
     * One request per pause, and never two answers racing. Without the abort a
     * slow response for `ge` can land after a fast one for `gen` and overwrite
     * it, so the list shows results for a query the anon has already finished
     * typing past.
     */
    useEffect(() => {
        if (!open) {
            return;
        }

        const controller = new AbortController();
        const timer = setTimeout(() => {
            setLoading(true);

            fetch(`/search/suggest?q=${encodeURIComponent(query)}`, {
                signal: controller.signal,
                headers: { Accept: 'application/json' },
            })
                .then((response) => (response.ok ? response.json() : null))
                .then((data: Suggestions | null) => {
                    setResults(data ?? EMPTY);
                    setLoading(false);
                })
                .catch(() => {
                    /* An abort is the normal case here, not a failure: it means
                       another keystroke arrived. Either way the list keeps what
                       it has rather than flashing empty. */
                });
        }, DEBOUNCE_MS);

        return () => {
            controller.abort();
            clearTimeout(timer);
        };
    }, [query, open]);

    /** Closing on outside pointer down rather than on blur, so a click on a result lands. */
    useEffect(() => {
        if (!open) {
            return;
        }

        const onPointerDown = (event: PointerEvent): void => {
            if (!wrapper.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener('pointerdown', onPointerDown);

        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, [open]);

    /** ⌘K from anywhere, which the field has always advertised and never had. */
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                input.current?.focus();
                setOpen(true);
            }
        };

        document.addEventListener('keydown', onKeyDown);

        return () => document.removeEventListener('keydown', onKeyDown);
    }, []);

    const runSearch = useCallback((term: string) => {
        const trimmed = term.trim();

        if (trimmed === '') {
            return;
        }

        rememberSearch(trimmed);
        setOpen(false);
        router.visit(`${searchRoute.url()}?q=${encodeURIComponent(trimmed)}`);
    }, []);

    const submit = useCallback(() => {
        runSearch(query);
    }, [query, runSearch]);

    /* Only while the box is empty. Once an anon is typing, what they want is
       the results, not the past. */
    const showsHistory = query.trim() === '' && history.length > 0;

    const hasResults = results.boards.length > 0 || results.threads.length > 0;

    return (
        <div ref={wrapper} className={cn('relative', className)}>
            <div className="flex h-9.5 w-full items-center gap-2 rounded-md border border-border bg-surface px-3 focus-within:border-border-strong">
                <Search
                    aria-hidden="true"
                    className="size-4 shrink-0 text-faint"
                />
                <div className="relative min-w-0 flex-1">
                    <input
                        ref={input}
                        type="search"
                        role="combobox"
                        aria-expanded={open}
                        aria-controls={listId}
                        aria-autocomplete="list"
                        aria-keyshortcuts="Meta+K"
                        aria-label={placeholder}
                        value={query}
                        data-slot="search-field"
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setOpen(true);
                        }}
                        onFocus={() => setOpen(true)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                submit();
                            }

                            if (event.key === 'Escape') {
                                setOpen(false);
                            }
                        }}
                        className="w-full bg-transparent text-body-sm text-foreground outline-none"
                    />
                    {/* A native `placeholder` attribute can only ever hold one
                        string, and "Search boards and threads" does not fit the
                        ~160px this field gets below `md` -- the browser's own
                        clipping is a word cut in half with no ellipsis to say
                        so, which reads as broken rather than short. This is a
                        second, purely visual copy of the same idea rather than
                        the real placeholder, so its wording can answer to
                        `md:` the way the input's own attribute cannot: short
                        below `md`, the full sentence at `md` and up, both
                        pinned in one span via `content-[...]` rather than a
                        second element that could drift out of sync with it.
                        `aria-label` above still carries the one accessible
                        name at every width. */}
                    {query === '' && (
                        <span
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 flex items-center text-body-sm text-muted-foreground before:content-['Search'] md:before:content-['Search_boards_and_threads']"
                        />
                    )}
                </div>
                <span
                    aria-hidden="true"
                    className="hidden shrink-0 rounded-sm border border-border px-1.5 py-0.5 text-caption text-faint tabular-nums sm:block"
                >
                    ⌘K
                </span>
            </div>

            {open ? (
                <div
                    id={listId}
                    role="listbox"
                    aria-label="Search results"
                    data-slot="search-results"
                    className="absolute inset-x-0 top-[calc(100%+6px)] z-50 max-h-[70vh] overflow-y-auto rounded-md border border-border bg-surface-elevated py-2 shadow-lift"
                >
                    {showsHistory ? (
                        <SearchGroup heading="Recent searches">
                            {history.map((term) => (
                                <li
                                    key={term}
                                    role="presentation"
                                    className="flex items-center gap-1 pr-1 hover:bg-surface-hover"
                                >
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected="false"
                                        onClick={() => runSearch(term)}
                                        className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2 text-left"
                                    >
                                        <Clock
                                            aria-hidden="true"
                                            className="size-4 shrink-0 text-faint"
                                        />
                                        <span className="truncate text-body-sm text-foreground">
                                            {term}
                                        </span>
                                    </button>

                                    {/* Its own button rather than an icon
                                        inside the row: a control nested in
                                        another control is invalid, and this
                                        one must not run the search it is
                                        removing. */}
                                    <button
                                        type="button"
                                        aria-label={`Remove "${term}" from recent searches`}
                                        onClick={() => forgetSearch(term)}
                                        className="grid size-7 shrink-0 place-items-center rounded-sm text-faint hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                    >
                                        <X
                                            aria-hidden="true"
                                            className="size-3.5"
                                        />
                                    </button>
                                </li>
                            ))}
                        </SearchGroup>
                    ) : null}

                    {results.boards.length > 0 ? (
                        <SearchGroup
                            heading={query === '' ? 'Busiest boards' : 'Boards'}
                        >
                            {results.boards.map((board) => (
                                <li key={board.slug} role="presentation">
                                    <Link
                                        role="option"
                                        aria-selected="false"
                                        href={boardHref(board.slug)}
                                        onClick={() => setOpen(false)}
                                        className="flex items-center gap-2.5 px-3 py-2 hover:bg-surface-hover"
                                    >
                                        <BoardAvatar
                                            slug={board.slug}
                                            size={24}
                                            decorative
                                        />
                                        <span className="truncate text-body-sm text-foreground">
                                            {board.name}
                                        </span>
                                        <MachineValue className="ml-auto shrink-0">
                                            {board.slug}
                                        </MachineValue>
                                    </Link>
                                </li>
                            ))}
                        </SearchGroup>
                    ) : null}

                    {results.threads.length > 0 ? (
                        <SearchGroup heading="Threads">
                            {results.threads.map((thread) => (
                                <li key={thread.no} role="presentation">
                                    <Link
                                        role="option"
                                        aria-selected="false"
                                        href={`${thread.board}${thread.no}`}
                                        onClick={() => setOpen(false)}
                                        className="flex flex-col gap-0.5 px-3 py-2 hover:bg-surface-hover"
                                    >
                                        <span className="line-clamp-1 text-body-sm text-foreground">
                                            {thread.title}
                                        </span>
                                        <MachineValue className="text-faint">
                                            {thread.board} · {thread.replies}{' '}
                                            replies
                                        </MachineValue>
                                    </Link>
                                </li>
                            ))}
                        </SearchGroup>
                    ) : null}

                    {!hasResults ? (
                        <p className="px-3 py-6 text-center text-body-sm text-muted-foreground">
                            {loading
                                ? 'Searching.'
                                : query === ''
                                  ? 'Type to search boards and threads.'
                                  : `Nothing matches "${query}".`}
                        </p>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}

/**
 * One labelled section of the dropdown.
 *
 * The heading was a bare `<p>`: visible, and invisible to assistive tech,
 * which got a flat run of options with nothing to say which were boards, which
 * were threads and which were things this anon had searched for before. Inside
 * a listbox that grouping is exactly what `role="group"` with a name is for,
 * and the name is the heading already on screen.
 */
function SearchGroup({
    heading,
    children,
}: {
    heading: string;
    children: React.ReactNode;
}) {
    const headingId = useId();

    return (
        <div role="group" aria-labelledby={headingId} className="py-1">
            <p
                id={headingId}
                className="px-3 pb-1 text-label font-semibold tracking-[1.2px] text-faint uppercase"
            >
                {heading}
            </p>
            <ul>{children}</ul>
        </div>
    );
}
