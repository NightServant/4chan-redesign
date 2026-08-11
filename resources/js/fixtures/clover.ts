import type {
    Achievement,
    ActivityEntry,
    Bookmark,
    Conversation,
    HistoryEntry,
    Profile,
    ProfileComment,
    ProfileStat,
} from '@/types/clover';

/**
 * Account-shaped design fixtures.
 *
 * Everything board-shaped has left this file. Boards, threads, posts and the
 * directory are ingested from 4chan's read-only JSON API and reach the screens
 * as Inertia props, so `BOARDS`, `THREADS`, `COMMENTS`, `BOARD_DIRECTORY` and
 * `TRENDING` were deleted rather than left behind as a second, staler copy of
 * data the server now owns.
 *
 * What remains is the half 4chan cannot supply, because it is not 4chan's:
 * this anon's profile, their history, their bookmarks, their messages and
 * their notifications. None of it has a backend yet. It is still lifted from
 * the Clover design prototype, and the copy is part of the design — it carries
 * the product's voice (blessings, anons, dry specifics) and should not be
 * paraphrased.
 *
 * These go the same way as the rest in the account task; the
 * `@/types/clover` contracts stay the same across that swap.
 *
 * One consequence of the API landing: `Thread` no longer carries `views`,
 * because nothing upstream counts views. The bookmarked threads below spell
 * out `images` instead, which is the figure the API does report.
 */

export const ACTIVITY: readonly ActivityEntry[] = [
    {
        icon: 'message-square',
        text: 'Anonymous replied to your post in /g/',
        time: '2 min ago',
    },
    {
        icon: 'arrow-big-up',
        text: 'Your post reached 2.4K blessings',
        time: '26 min ago',
    },
    {
        icon: 'shield',
        text: 'Your report was actioned in /biz/',
        time: '1 hr ago',
    },
    { icon: 'bookmark', text: 'You saved a thread in /x/', time: '3 hr ago' },
] as const;

export const HISTORY: readonly HistoryEntry[] = [
    {
        no: 58210441,
        board: '/g/',
        title: 'RISC-V laptops are finally usable as daily drivers',
        when: 'Today, 14:02',
        progress: 68,
        media: 'thumb · 640×360',
    },
    {
        no: 58209914,
        board: '/x/',
        title: 'The 1993 Kola borehole tapes have a fourth track nobody transcribed',
        when: 'Today, 11:47',
        progress: 100,
        media: 'thumb · 640×360',
    },
    {
        no: 58208110,
        board: '/wg/',
        title: 'Dark minimal wallpaper thread — 3840x2160 only',
        when: 'Yesterday, 22:15',
        progress: 24,
        media: 'thumb · 640×360',
    },
    {
        no: 58207766,
        board: '/biz/',
        title: 'Anyone else notice freelance rates collapsing this quarter?',
        when: 'Yesterday, 19:30',
        progress: 45,
        media: 'thumb · 640×360',
    },
    {
        no: 58206201,
        board: '/fit/',
        title: 'Two years of walking 15k steps a day, no gym. Results inside.',
        when: 'Mon, 08:12',
        progress: 90,
        media: 'thumb · 640×360',
    },
] as const;

/**
 * The signed-in anon, as their own profile page shows them.
 *
 * Lifted from `cl-account.jsx`. The bio's last sentence is the product's
 * whole argument in one line and is kept exactly as the design wrote it.
 */
export const PROFILE: Profile = {
    handle: 'anon_4412',
    tripcode: '!!Xk29fLp2',
    bio: 'Reads /g/ at 3am. Keeps a homelab that costs more than the car. Posts are anonymous — this page is not.',
    joined: '14 Mar 2024',
    janitorScope: ['/g/', '/wg/'],
} as const;

export const PROFILE_STATS: readonly ProfileStat[] = [
    { label: 'Posts', value: '412' },
    { label: 'Comments', value: '3,908' },
    { label: 'Reputation', value: '11,204' },
    { label: 'Bookmarks', value: '96' },
] as const;

export const ACHIEVEMENTS: readonly Achievement[] = [
    { icon: 'flame', title: 'Bumped 100 threads', meta: 'Since Mar 2024' },
    { icon: 'star', title: '10K blessings received', meta: 'Since Jan 2025' },
    { icon: 'shield', title: 'Janitor · /g/, /wg/', meta: 'Since Aug 2025' },
] as const;

/**
 * Replies this anon wrote, for the profile's Comments tab.
 *
 * The design renders one hardcoded body against four different threads, which
 * reads as a rendering bug rather than as data. These are four distinct
 * replies in the same register, each answering the thread it sits under.
 */
export const PROFILE_COMMENTS: readonly ProfileComment[] = [
    {
        no: 58210452,
        board: '/g/',
        threadNo: 58210441,
        time: '2 min ago',
        body: 'Eight cores, 16 GB. It is not fast, it is usable. Those are different claims.',
        quoted: 'forty minutes is not "fine"',
    },
    {
        no: 58210302,
        board: '/biz/',
        threadNo: 58210277,
        time: '31 min ago',
        body: 'Same in Lisbon. Two clients moved to fixed-price and called it a rate freeze.',
    },
    {
        no: 58209960,
        board: '/x/',
        threadNo: 58209914,
        time: '52 min ago',
        body: 'Track four is tape hiss and a relay. Depends entirely on the transfer, mine is clean since I resampled at 96k.',
        quoted: 'just use the vendor rip',
    },
    {
        no: 58209588,
        board: '/fit/',
        threadNo: 58209502,
        time: '2 hr ago',
        body: 'Two years of walking beats six weeks of anything else. Nobody wants to hear it.',
    },
] as const;

/**
 * Attachments on this anon's posts. Filenames and dimensions only — Clover
 * never invents an image, so these render as labelled placeholders.
 */
export const PROFILE_MEDIA: readonly string[] = [
    'ridge-4k.png · 3840×2160',
    'progress-2y.jpg · 1440×1800',
    'rack-2026.jpg · 2048×1536',
    'chart.png · 1200×900',
    'bench.png · 1600×1000',
    'desk.jpg · 2400×1600',
] as const;

/**
 * Threads the anon saved.
 *
 * These used to point into `THREADS`, so a bookmark could never drift out of
 * sync with its thread. `THREADS` is gone: the real ones arrive as props, and
 * a bookmark cannot reference a row this file no longer holds. So each entry
 * now carries its own `Thread`, which is what a saved thread will look like
 * anyway once bookmarks are stored — a snapshot the anon kept, joined back to
 * a real thread by `no` and `board` rather than by array index.
 *
 * `note` is the anon's own annotation. Two are empty on purpose: a note is
 * optional, and a list where every row has one would not exercise the case.
 */
export const BOOKMARKS: readonly Bookmark[] = [
    {
        thread: {
            no: 58209914,
            board: '/x/',
            boardName: 'Paranormal',
            time: '1 hr ago',
            title: 'The 1993 Kola borehole tapes have a fourth track nobody transcribed',
            excerpt:
                'Pulled the archive off a university FTP. Track four is 19 minutes of nothing and then a click.',
            blessings: 3391,
            replies: 811,
            images: '112',
            media: null,
            pinned: false,
        },
        savedAt: 'Saved 2 days ago',
        note: 'Track four timestamp is 11:42, not 11:24 like the OP says.',
    },
    {
        thread: {
            no: 58210441,
            board: '/g/',
            boardName: 'Technology',
            time: '4 min ago',
            title: 'RISC-V laptops are finally usable as daily drivers',
            excerpt:
                'Ordered the DC-ROMA II in March. Compiling LLVM takes 40 minutes but everything else is fine. Ask me anything.',
            blessings: 2412,
            replies: 318,
            images: '41',
            media: null,
            pinned: false,
        },
        savedAt: 'Saved 4 days ago',
        note: '',
    },
    {
        thread: {
            no: 58210277,
            board: '/biz/',
            boardName: 'Business',
            time: '38 min ago',
            title: 'Anyone else notice freelance rates collapsing this quarter?',
            excerpt:
                'Three agencies I work with cut their day rate by a third. Curious whether this is regional.',
            blessings: 1207,
            replies: 542,
            images: '18',
            media: null,
            pinned: true,
        },
        savedAt: 'Saved last week',
        note: 'Check whether this held up next quarter.',
    },
    {
        thread: {
            no: 58209502,
            board: '/fit/',
            boardName: 'Fitness',
            time: '2 hr ago',
            title: 'Two years of walking 15k steps a day, no gym. Results inside.',
            excerpt:
                'Started at 118 kg. No diet changes for the first year, then cut sugar drinks only.',
            blessings: 5108,
            replies: 1204,
            images: '96',
            media: 'progress-2y.jpg · 1440×1800 · 812 KB',
            pinned: false,
        },
        savedAt: 'Saved last week',
        note: '',
    },
] as const;

/**
 * Direct messages.
 *
 * Messaging is an account feature, so correspondents are handles rather than
 * post numbers: nothing here ties back to anything either anon posted. The
 * copy stays in register — terse, specific, and about the boards themselves.
 *
 * The first conversation is unread and the last is a one-sided message with
 * no reply, so the list has both states to render.
 */
export const CONVERSATIONS: readonly Conversation[] = [
    {
        id: 1,
        handle: 'anon_7781',
        time: '2 min ago',
        unread: 2,
        messages: [
            {
                id: 1,
                outgoing: false,
                body: 'You janitor /g/, right? There is a bot dumping the same three links across every homelab thread.',
                time: '11 min ago',
            },
            {
                id: 2,
                outgoing: true,
                body: 'Seen it. Same host each time, so the filter catches it about a minute after it posts.',
                time: '8 min ago',
            },
            {
                id: 3,
                outgoing: false,
                body: 'A minute is long enough for it to get bumped to the top.',
                time: '3 min ago',
            },
            {
                id: 4,
                outgoing: false,
                body: 'Can the filter run before the bump instead of after?',
                time: '2 min ago',
            },
        ],
    },
    {
        id: 2,
        handle: 'anon_0294',
        time: '1 hr ago',
        unread: 0,
        messages: [
            {
                id: 1,
                outgoing: false,
                body: 'That RISC-V thread is the first honest one I have read. Everyone else is benchmarking a fan curve.',
                time: '2 hr ago',
            },
            {
                id: 2,
                outgoing: true,
                body: 'It is a slow machine that does what I need. That is the whole review.',
                time: '1 hr ago',
            },
        ],
    },
    {
        id: 3,
        handle: 'anon_5530',
        time: 'Yesterday',
        unread: 0,
        messages: [
            {
                id: 1,
                outgoing: true,
                body: 'Your wallpaper dump had one at 5120x2880 mislabelled as 4K. Worth reposting the correct size.',
                time: 'Yesterday',
            },
        ],
    },
] as const;
