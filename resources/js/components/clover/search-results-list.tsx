import { Link } from '@inertiajs/react';
import { Clock, X } from 'lucide-react';
import { useId } from 'react';
import { BoardAvatar } from '@/components/clover/board-avatar';
import { MachineValue } from '@/components/clover/machine-value';
import type { Suggestions } from '@/hooks/use-search-suggestions';
import { board as boardRoute } from '@/routes';

/**
 * The grouped list a search box offers: recent searches, then boards and
 * threads matching a query (or the busiest boards, for no query).
 *
 * Extracted out of `SearchField`, which used to be the only place this
 * rendered. The search page's below-`md` suggestions screen (task 6) draws
 * the same groups inline in the page rather than inside a floating popover
 * — same content, same behaviour, different container — so this component
 * owns the content and the caller owns how it sits on screen: pass a
 * `className` for positioning, nothing here assumes it is a dropdown.
 */
export type SearchResultsListProps = {
    listId: string;
    query: string;
    loading: boolean;
    results: Suggestions;
    /** What this anon searched for before, on this device. */
    history: string[];
    onSelectHistory: (term: string) => void;
    onForgetHistory: (term: string) => void;
    /** Called after a board or a thread link is chosen, e.g. to close a dropdown. */
    onSelectResult?: () => void;
    className?: string;
};

function boardHref(slug: string): string {
    return boardRoute.url(slug.replaceAll('/', ''));
}

export function SearchResultsList({
    listId,
    query,
    loading,
    results,
    history,
    onSelectHistory,
    onForgetHistory,
    onSelectResult,
    className,
}: SearchResultsListProps) {
    /* Only while the box is empty. Once an anon is typing, what they want is
       the results, not the past. */
    const showsHistory = query.trim() === '' && history.length > 0;

    const hasResults = results.boards.length > 0 || results.threads.length > 0;

    return (
        <div
            id={listId}
            role="listbox"
            aria-label="Search results"
            data-slot="search-results"
            className={className}
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
                                onClick={() => onSelectHistory(term)}
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

                            {/* Its own button rather than an icon inside the
                                row: a control nested in another control is
                                invalid, and this one must not run the search
                                it is removing. */}
                            <button
                                type="button"
                                aria-label={`Remove "${term}" from recent searches`}
                                onClick={() => onForgetHistory(term)}
                                className="touch-target-44 grid size-7 shrink-0 place-items-center rounded-sm text-faint hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                            >
                                <X aria-hidden="true" className="size-3.5" />
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
                                onClick={onSelectResult}
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
                        <li key={thread.id} role="presentation">
                            <Link
                                role="option"
                                aria-selected="false"
                                href={`${thread.board}${thread.no}`}
                                onClick={onSelectResult}
                                className="flex flex-col gap-0.5 px-3 py-2 hover:bg-surface-hover"
                            >
                                <span className="line-clamp-1 text-body-sm text-foreground">
                                    {thread.title}
                                </span>
                                <MachineValue className="text-faint">
                                    {thread.board} · {thread.replies} replies
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
    );
}

/**
 * One labelled section of the list.
 *
 * The heading was a bare `<p>`, once: visible, and invisible to assistive
 * tech, which got a flat run of options with nothing to say which were
 * boards, which were threads and which were things this anon had searched
 * for before. Inside a listbox that grouping is exactly what `role="group"`
 * with a name is for, and the name is the heading already on screen.
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
