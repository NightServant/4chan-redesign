import { Search } from 'lucide-react';
import {
    useEffect,
    useId,
    useRef,
    useState,
    useSyncExternalStore,
} from 'react';
import { SearchResultsList } from '@/components/clover/search-results-list';
import { useSearchSuggestions } from '@/hooks/use-search-suggestions';
import { runSearch } from '@/lib/run-search';
import {
    forgetSearch,
    searchHistoryServerSnapshot,
    searchHistorySnapshot,
    subscribeToSearchHistory,
} from '@/lib/search-history';
import { cn } from '@/lib/utils';

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
 * ## Two callers now, one set of moving parts
 *
 * The search page's below-`md` suggestions screen (task 6) needs the exact
 * same fetch, debounce, abort and history reading this field already has —
 * the field an anon types into there behaves identically, just full-screen
 * instead of in a popover. Those pieces live in `useSearchSuggestions` and
 * `runSearch` now, not here, so this component and that screen share one
 * implementation of each rather than two that could drift the way the
 * history list once did before task 4 undid exactly that. `SearchResultsList`
 * is the same split applied to the rendered list itself: this component owns
 * the input and the popover it opens into; that component owns the groups
 * inside it.
 *
 * ## Why `fetch` rather than an Inertia visit, for the suggestions themselves
 *
 * A list that updates while an anon types is not a page visit: it must not push
 * history, must not replace the page under them, and must cancel the request
 * that is already in flight the moment another keystroke lands. Pressing Enter
 * is a navigation and goes through Inertia (`runSearch`), because that one *is*
 * a page visit.
 */
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

    /**
     * The fetch, debounce and abort live in this hook now, shared with the
     * search page's suggestions screen. `open` is what "active" means here:
     * a closed dropdown has nothing to show, so there is nothing to fetch.
     */
    const { results, loading } = useSearchSuggestions(query, open);

    const input = useRef<HTMLInputElement>(null);
    const wrapper = useRef<HTMLDivElement>(null);
    const listId = useId();

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
                /* Nothing at all when this field is not on screen. Below
                   `md` it sits inside `hidden md:block`, so `focus()` on a
                   `display: none` input does nothing in a browser -- but
                   `setOpen(true)` still ran, firing a `/search/suggest`
                   request and mounting a dropdown nobody could see.

                   `checkVisibility` asks the browser rather than restating
                   the breakpoint here, and it answers for ancestors too,
                   which is where the `hidden` actually lives. jsdom applies
                   no stylesheet, so it reports this field visible there and
                   the shortcut stays testable. */
                if (input.current?.checkVisibility?.() === false) {
                    return;
                }

                event.preventDefault();
                input.current?.focus();
                setOpen(true);
            }
        };

        document.addEventListener('keydown', onKeyDown);

        return () => document.removeEventListener('keydown', onKeyDown);
    }, []);

    function submit(term: string): void {
        runSearch(term);
        setOpen(false);
    }

    return (
        <div ref={wrapper} className={cn('relative', className)}>
            {/* 38px at rest, 44px on a coarse pointer -- a tablet at `md` and
                up is where this field lives, and a finger's target is the
                whole bar. The input stretches to fill it rather than sitting
                at its own line height in the middle: without that, the row
                grew and the only thing actually tappable stayed a ~20px strip
                of text, which is the shape of hit-area bug this codebase has
                shipped before. */}
            <div className="flex h-9.5 w-full items-center gap-2 rounded-md border border-border bg-surface px-3 focus-within:border-border-strong pointer-coarse:h-11">
                <Search
                    aria-hidden="true"
                    className="size-4 shrink-0 text-faint"
                />
                <div className="relative min-w-0 flex-1 self-stretch">
                    <input
                        ref={input}
                        type="search"
                        role="combobox"
                        aria-expanded={open}
                        aria-controls={listId}
                        aria-autocomplete="list"
                        aria-keyshortcuts="Meta+K"
                        aria-label={placeholder}
                        /* A plain native placeholder again. This wore a
                           `before:content-['Search'] md:before:content-[...]`
                           ghost span so the wording could shorten below `md`,
                           where the field had ~160px. Task 6 moved that width
                           out from under it: below `md` the header renders a
                           button that visits the search page, and this
                           component is inside `hidden md:block`, so the short
                           branch was styling nobody could ever see. */
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
                                submit(query);
                            }

                            if (event.key === 'Escape') {
                                setOpen(false);
                            }
                        }}
                        className="h-full w-full bg-transparent text-body-sm text-foreground outline-none"
                    />
                </div>
                <span
                    aria-hidden="true"
                    className="hidden shrink-0 rounded-sm border border-border px-1.5 py-0.5 text-caption text-faint tabular-nums sm:block"
                >
                    ⌘K
                </span>
            </div>

            {open ? (
                <SearchResultsList
                    listId={listId}
                    query={query}
                    loading={loading}
                    results={results}
                    history={history}
                    onSelectHistory={submit}
                    onForgetHistory={forgetSearch}
                    onSelectResult={() => setOpen(false)}
                    className="absolute inset-x-0 top-[calc(100%+6px)] z-50 max-h-[70vh] overflow-y-auto rounded-md border border-border bg-surface-elevated py-2 shadow-lift"
                />
            ) : null}
        </div>
    );
}
