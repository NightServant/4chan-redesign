import type {
    Board,
    BoardDirectoryEntry,
    Comment,
    Thread,
    TrendingTag,
} from '@/types/clover';

/**
 * Builders for the shapes that used to be design fixtures.
 *
 * Boards, threads and posts come from the server now, so the constant arrays
 * the component tests imported are gone. Tests still need instances of those
 * shapes, and the two obvious replacements are both bad: repeating a
 * twelve-field object literal in ninety tests, or keeping a shared constant
 * that every test quietly depends on the exact contents of. The second is what
 * the fixtures had become — tests asserting on `58210441` because that was
 * simply what was in the file.
 *
 * These take an override and fill the rest, so a test states only the fields it
 * is actually about, and nothing else it asserts can be an accident.
 *
 * Not design fixtures: nothing here is product copy and none of it is rendered
 * anywhere. The remaining real fixtures in `./clover` stay as they are until
 * task 11b replaces them.
 */

let sequence = 0;

/** Post numbers only have to be distinct and realistic, not stable. */
function nextPostNumber(): number {
    sequence += 1;

    return 100_000_000 + sequence;
}

export function makeBoard(overrides: Partial<Board> = {}): Board {
    return {
        slug: '/g/',
        name: 'Technology',
        threads: '18,402',
        ...overrides,
    };
}

export function makeThread(overrides: Partial<Thread> = {}): Thread {
    return {
        no: nextPostNumber(),
        board: '/g/',
        boardName: 'Technology',
        time: '4 min ago',
        title: 'Anons are still arguing about init systems',
        blessings: 0,
        replies: 12,
        images: '3',
        media: null,
        pinned: false,
        ...overrides,
    };
}

export function makeComment(overrides: Partial<Comment> = {}): Comment {
    return {
        no: nextPostNumber(),
        quotes: [],
        author: 'Anonymous',
        time: '2 min ago',
        body: 'A reply.',
        blessings: 0,
        op: false,
        replies: [],
        ...overrides,
    };
}

export function makeDirectoryEntry(
    overrides: Partial<BoardDirectoryEntry> = {},
): BoardDirectoryEntry {
    return {
        ...makeBoard(),
        description: 'Hardware, software and the arguments between them.',
        category: 'Interests',
        subscribed: false,
        worksafe: true,
        ...overrides,
    };
}

export function makeTrendingTag(
    overrides: Partial<TrendingTag> = {},
): TrendingTag {
    return {
        tag: '/g/',
        posts: '4,182 posts',
        ...overrides,
    };
}
