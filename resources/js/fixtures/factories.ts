import type {
    ActivityEntry,
    Attachment,
    Board,
    BoardDirectoryEntry,
    Bookmark,
    Comment,
    HistoryEntry,
    Profile,
    ProfileComment,
    ProfileStat,
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
        id: nextPostNumber(),
        slug: '/g/',
        name: 'Technology',
        threads: '18,402',
        nsfw: false,
        subscribed: false,
        ...overrides,
    };
}

export function makeThread(overrides: Partial<Thread> = {}): Thread {
    return {
        id: nextPostNumber(),
        no: nextPostNumber(),
        board: '/g/',
        boardName: 'Technology',
        time: '4 min ago',
        title: 'Anons are still arguing about init systems',
        nsfw: false,
        replies: 12,
        images: '3',
        media: null,
        pinned: false,
        bookmarked: false,
        ...overrides,
    };
}

export function makeComment(overrides: Partial<Comment> = {}): Comment {
    return {
        id: nextPostNumber(),
        no: nextPostNumber(),
        quotes: [],
        author: 'Anonymous',
        time: '2 min ago',
        body: 'A reply.',
        op: false,
        media: null,
        replies: [],
        ...overrides,
    };
}

/**
 * An attachment as the server sends it.
 *
 * URLs are the real CDN shape — `{tim}{ext}` for the file and `{tim}s.jpg`
 * for the thumbnail — so a test that asserts on one is asserting on the
 * arrangement the application actually produces.
 */
export function makeAttachment(
    overrides: Partial<Attachment> = {},
): Attachment {
    return {
        label: 'x230.png · 1440x900 · 412 KB',
        filename: 'x230.png',
        thumbnailUrl: 'https://i.4cdn.org/g/1745612650141704s.jpg',
        fullUrl: 'https://i.4cdn.org/g/1745612650141704.png',
        width: 1440,
        height: 900,
        thumbWidth: 250,
        thumbHeight: 156,
        concealed: null,
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

export function makeProfile(overrides: Partial<Profile> = {}): Profile {
    return {
        handle: 'anon_4412',
        tripcode: null,
        bio: 'Reads /g/ at 3am.',
        joined: '14 Mar 2024',
        ...overrides,
    };
}

export function makeStat(overrides: Partial<ProfileStat> = {}): ProfileStat {
    return { label: 'Posts', value: '0', ...overrides };
}

export function makeActivity(
    overrides: Partial<ActivityEntry> = {},
): ActivityEntry {
    return {
        icon: 'message-square',
        text: 'You replied in /g/',
        time: '2 min ago',
        ...overrides,
    };
}

export function makeProfileComment(
    overrides: Partial<ProfileComment> = {},
): ProfileComment {
    return {
        no: nextPostNumber(),
        board: '/g/',
        threadNo: nextPostNumber(),
        time: '2 min ago',
        body: 'A reply this anon wrote.',
        ...overrides,
    };
}

export function makeHistoryEntry(
    overrides: Partial<HistoryEntry> = {},
): HistoryEntry {
    return {
        id: nextPostNumber(),
        no: nextPostNumber(),
        board: '/g/',
        title: 'Anons are still arguing about init systems',
        when: 'Today, 14:02',
        day: 'Today',
        progress: 40,
        media: null,
        ...overrides,
    };
}

export function makeBookmark(overrides: Partial<Bookmark> = {}): Bookmark {
    return {
        thread: makeThread(),
        savedAt: 'Saved 2 days ago',
        note: '',
        ...overrides,
    };
}
