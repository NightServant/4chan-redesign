import { search as searchRoute } from '@/routes';

/**
 * The search page's three URL controls: which tab, which ordering, which
 * window of time.
 *
 * They live in the URL rather than in component state so a result list is
 * shareable and survives a reload, and they live in *this* file so the page,
 * the tab row and the two menus all build the same URL. `SearchController`
 * validates the same three names and falls back the same way; when these two
 * disagree, the page draws a control as chosen over results ordered some
 * other way, which is the failure this module exists to make impossible.
 */

export const SEARCH_TYPES = [
    'all',
    'posts',
    'communities',
    'comments',
] as const;

export type SearchType = (typeof SEARCH_TYPES)[number];

/**
 * Three orderings, and deliberately not four.
 *
 * Reddit sorts by Top. Clover has no votes — blessings were deleted — so
 * there is no score on a post to sort by, and nothing here stands in for one
 * under another name. `replies` is a real count; `relevant` is what each
 * query already ranks by; `latest` is the timestamp the row already shows.
 */
export const SEARCH_SORTS = ['relevant', 'latest', 'replies'] as const;

export type SearchSort = (typeof SEARCH_SORTS)[number];

export const SEARCH_TIMES = ['all', 'today', 'week', 'month'] as const;

export type SearchTime = (typeof SEARCH_TIMES)[number];

export const SEARCH_TYPE_LABELS: Record<SearchType, string> = {
    all: 'All',
    posts: 'Posts',
    communities: 'Communities',
    comments: 'Comments',
};

/**
 * The trigger reads as the current value rather than as the control's name,
 * so each of these has to stand on its own on a button: "Relevance", not
 * "Relevant", which reads as a sentence fragment with the "Sort:" removed.
 */
export const SEARCH_SORT_LABELS: Record<SearchSort, string> = {
    relevant: 'Relevance',
    latest: 'Latest',
    replies: 'Most replies',
};

export const SEARCH_TIME_LABELS: Record<SearchTime, string> = {
    all: 'All time',
    today: 'Today',
    week: 'This week',
    month: 'This month',
};

/**
 * Which orderings this tab can honestly apply.
 *
 * "Most replies" counts replies. A board has none of its own and a reply is
 * not a thread, so on those two tabs the option is not offered rather than
 * offered and ignored.
 */
export function sortOptionsFor(type: SearchType): SearchSort[] {
    return type === 'comments' || type === 'communities'
        ? ['relevant', 'latest']
        : [...SEARCH_SORTS];
}

/**
 * Whether the time filter means anything on this tab.
 *
 * It does not on Communities: a board's only date here is when this mirror
 * first synced it, which is a fact about Clover and not about the board.
 */
export function timeAppliesTo(type: SearchType): boolean {
    return type !== 'communities';
}

export type SearchParams = {
    q: string;
    type?: SearchType;
    sort?: SearchSort;
    time?: SearchTime;
};

/**
 * The URL for a search.
 *
 * Defaults are omitted, so an ordinary search stays `/search?q=risc` rather
 * than growing three parameters that say "as usual". A control the
 * destination tab cannot apply is dropped rather than carried: switching from
 * Posts sorted by most replies to Communities produces a Communities URL with
 * no sort on it, because the server would normalise it away anyway and the
 * page would then mark an option nothing was ordered by.
 *
 * Encoded with `encodeURIComponent`, which is what `runSearch` has always
 * produced (`%20`, not `+`), so the one builder covers both callers.
 */
export function searchUrl({
    q,
    type = 'all',
    sort = 'relevant',
    time = 'all',
}: SearchParams): string {
    const parts: string[] = [];

    if (q !== '') {
        parts.push(`q=${encodeURIComponent(q)}`);
    }

    if (type !== 'all') {
        parts.push(`type=${type}`);
    }

    if (sort !== 'relevant' && sortOptionsFor(type).includes(sort)) {
        parts.push(`sort=${sort}`);
    }

    if (time !== 'all' && timeAppliesTo(type)) {
        parts.push(`time=${time}`);
    }

    return parts.length === 0
        ? searchRoute.url()
        : `${searchRoute.url()}?${parts.join('&')}`;
}
