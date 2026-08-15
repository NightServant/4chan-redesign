/**
 * What this anon has searched for, on this device.
 *
 * ## Why `localStorage` and not a table
 *
 * Everything else Clover records about an anon is theirs on the server —
 * bookmarks, read threads, replies — because all of it is about the boards and
 * has to follow them between devices. A search box's history is not that: it
 * is a convenience for the box, most of it is half-typed, and shipping it to
 * the server would mean this application holding a log of what every anon
 * looked for. On a site whose premise is that it does not know who you are,
 * that is the wrong thing to start storing.
 *
 * So it stays in the browser, where an anon can clear it with the rest of
 * their site data, and where a signed-out visitor gets it too.
 *
 * ## Everything read back is untrusted
 *
 * `localStorage` is shared with every other script on the origin and survives
 * deploys, so the stored value can be anything by the time it is read: written
 * by an older version, edited by hand, or not JSON at all. A parse failure has
 * to read as "no history" rather than throw, because the thing that reads it is
 * a control an anon merely focused.
 */
const STORAGE_KEY = 'clover:search-history';

/**
 * How many searches are kept.
 *
 * The dropdown shows them under the results, so this is bounded by what fits
 * above the fold rather than by what the browser could hold.
 */
export const HISTORY_LIMIT = 6;

/**
 * The last raw string read out of storage, and the array it parsed to.
 *
 * `useSyncExternalStore` compares snapshots by identity and re-renders
 * whenever they differ, so a snapshot that parsed a fresh array on every call
 * would differ every time and spin the component forever. Caching against the
 * raw string gives identity while it is unchanged and a new array the moment
 * it is not — including when something outside this module writes to the key.
 */
let cachedRaw: string | null = null;
let cachedHistory: string[] = [];

/** Stable empty array, for the same identity reason. */
const NONE: string[] = [];

type Listener = () => void;

const listeners = new Set<Listener>();

/** The same normalisation used to match repeats and to compare on removal. */
function normalise(query: string): string {
    return query.trim().toLowerCase();
}

function write(history: readonly string[]): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
        /* Private browsing and a full quota both throw here. Losing the
           history is the correct outcome; taking the search box down with it
           is not. */
    }

    for (const listener of listeners) {
        listener();
    }
}

function rawValue(): string | null {
    try {
        return localStorage.getItem(STORAGE_KEY);
    } catch {
        return null;
    }
}

/**
 * The current history, as one array that keeps its identity until the stored
 * value actually changes. Read by `useSyncExternalStore`.
 */
export function searchHistorySnapshot(): string[] {
    const raw = rawValue();

    if (raw !== cachedRaw) {
        cachedRaw = raw;
        cachedHistory = readSearchHistory();
    }

    return cachedHistory;
}

/**
 * What the server renders before there is a browser to read.
 *
 * `localStorage` does not exist during SSR, and `useSyncExternalStore` demands
 * a separate server snapshot rather than letting the client one throw.
 */
export function searchHistoryServerSnapshot(): string[] {
    return NONE;
}

export function subscribeToSearchHistory(listener: Listener): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

export function readSearchHistory(): string[] {
    try {
        const stored: unknown = JSON.parse(
            localStorage.getItem(STORAGE_KEY) ?? '[]',
        );

        if (!Array.isArray(stored)) {
            return [];
        }

        return stored.every((entry) => typeof entry === 'string')
            ? (stored as string[])
            : [];
    } catch {
        return [];
    }
}

/**
 * Records a search, most recent first.
 *
 * A repeat moves to the front rather than appearing twice: coming back to a
 * term you use often is the common case, and a list that grows a second copy
 * every time is a list that fills with one word.
 */
export function rememberSearch(query: string): void {
    const trimmed = query.trim();

    if (trimmed === '') {
        return;
    }

    const key = normalise(trimmed);
    const rest = readSearchHistory().filter(
        (entry) => normalise(entry) !== key,
    );

    write([trimmed, ...rest].slice(0, HISTORY_LIMIT));
}

export function forgetSearch(query: string): void {
    const key = normalise(query);

    write(readSearchHistory().filter((entry) => normalise(entry) !== key));
}
