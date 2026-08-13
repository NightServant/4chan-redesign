import { Link, router } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { BoardAvatar } from '@/components/clover/board-avatar';
import { MachineValue } from '@/components/clover/machine-value';
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

    const submit = useCallback(() => {
        if (query.trim() === '') {
            return;
        }

        setOpen(false);
        router.visit(`${searchRoute.url()}?q=${encodeURIComponent(query)}`);
    }, [query]);

    const hasResults = results.boards.length > 0 || results.threads.length > 0;

    return (
        <div ref={wrapper} className={cn('relative', className)}>
            <div className="flex h-9.5 w-full items-center gap-2 rounded-md border border-border bg-surface px-3 focus-within:border-border-strong">
                <Search
                    aria-hidden="true"
                    className="size-4 shrink-0 text-faint"
                />
                <input
                    ref={input}
                    type="search"
                    role="combobox"
                    aria-expanded={open}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-keyshortcuts="Meta+K"
                    aria-label={placeholder}
                    placeholder={placeholder}
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
                    className="min-w-0 flex-1 bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
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

function SearchGroup({
    heading,
    children,
}: {
    heading: string;
    children: React.ReactNode;
}) {
    return (
        <div className="py-1">
            <p className="px-3 pb-1 text-label font-semibold tracking-[1.2px] text-faint uppercase">
                {heading}
            </p>
            <ul>{children}</ul>
        </div>
    );
}
