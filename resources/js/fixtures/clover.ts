import type {
    Achievement,
    ActivityEntry,
    Board,
    BoardDirectoryEntry,
    Bookmark,
    Comment,
    Conversation,
    HistoryEntry,
    Profile,
    ProfileComment,
    ProfileStat,
    Thread,
    TrendingTag,
} from '@/types/clover';

/**
 * Design fixtures.
 *
 * Lifted verbatim from the Clover design prototype so screens can be built and
 * reviewed before the backend exists. Copy is part of the design — it
 * demonstrates the product's voice (blessings, anons, dry specifics) and
 * should not be paraphrased.
 *
 * These are replaced by Inertia props from Eloquent models in the backend
 * task; the `@/types/clover` contracts stay the same across that swap.
 */

export const BOARDS: readonly Board[] = [
    { slug: '/g/', name: 'Technology', online: '41,208' },
    { slug: '/wg/', name: 'Wallpapers', online: '9,114' },
    { slug: '/biz/', name: 'Business', online: '12,860' },
    { slug: '/x/', name: 'Paranormal', online: '7,442' },
    { slug: '/fit/', name: 'Fitness', online: '15,309' },
    { slug: '/co/', name: 'Comics', online: '6,027' },

    /* Routable, so it must be here: `config/clover.php` accepts `/b/`, and a
       slug the router serves but this list does not carry renders a blank
       page rather than a 404. See `BoardCatalogueTest`. */
    { slug: '/b/', name: 'Random', online: '58,730' },
] as const;

export const THREADS: readonly Thread[] = [
    {
        no: 58210441,
        board: '/g/',
        boardName: 'Technology',
        time: '4 min ago',
        title: 'RISC-V laptops are finally usable as daily drivers',
        excerpt:
            'Ordered the DC-ROMA II in March. Compiling LLVM takes 40 minutes but everything else is fine. Ask me anything.',
        blessings: 2412,
        replies: 318,
        views: '48,201',
        media: null,
        pinned: false,
    },
    {
        no: 58210398,
        board: '/wg/',
        boardName: 'Wallpapers',
        time: '11 min ago',
        title: 'Dark minimal wallpaper thread — 3840x2160 only',
        excerpt: 'Dumping my folder. No AI slop, no logos, no watermarks.',
        blessings: 884,
        replies: 96,
        views: '21,455',
        media: 'ridge-4k.png · 3840×2160 · 4.1 MB',
        pinned: false,
    },
    {
        no: 58210277,
        board: '/biz/',
        boardName: 'Business',
        time: '38 min ago',
        title: 'Anyone else notice freelance rates collapsing this quarter?',
        excerpt:
            'Three agencies I work with cut their day rate by a third. Curious whether this is regional.',
        blessings: 1207,
        replies: 542,
        views: '90,338',
        media: null,
        pinned: true,
    },
    {
        no: 58209914,
        board: '/x/',
        boardName: 'Paranormal',
        time: '1 hr ago',
        title: 'The 1993 Kola borehole tapes have a fourth track nobody transcribed',
        excerpt:
            'Pulled the archive off a university FTP. Track four is 19 minutes of nothing and then a click.',
        blessings: 3391,
        replies: 811,
        views: '156,092',
        media: null,
        pinned: false,
    },
    {
        no: 58209502,
        board: '/fit/',
        boardName: 'Fitness',
        time: '2 hr ago',
        title: 'Two years of walking 15k steps a day, no gym. Results inside.',
        excerpt:
            'Started at 118 kg. No diet changes for the first year, then cut sugar drinks only.',
        blessings: 5108,
        replies: 1204,
        views: '312,770',
        media: 'progress-2y.jpg · 1440×1800 · 812 KB',
        pinned: false,
    },
] as const;

export const TRENDING: readonly TrendingTag[] = [
    { tag: 'risc-v', posts: '4,182 posts' },
    { tag: 'kola-borehole', posts: '3,905 posts' },
    { tag: 'freelance-rates', posts: '2,760 posts' },
    { tag: 'oled-burn-in', posts: '2,118 posts' },
    { tag: 'homelab', posts: '1,904 posts' },
] as const;

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
 * Threads the anon saved. Wraps entries from `THREADS` rather than restating
 * their titles, so a bookmark can never drift out of sync with its thread.
 *
 * `note` is the anon's own annotation. Two are empty on purpose: a note is
 * optional, and a list where every row has one would not exercise the case.
 */
export const BOOKMARKS: readonly Bookmark[] = [
    {
        thread: THREADS[3],
        savedAt: 'Saved 2 days ago',
        note: 'Track four timestamp is 11:42, not 11:24 like the OP says.',
    },
    { thread: THREADS[0], savedAt: 'Saved 4 days ago', note: '' },
    {
        thread: THREADS[2],
        savedAt: 'Saved last week',
        note: 'Check whether this held up next quarter.',
    },
    { thread: THREADS[4], savedAt: 'Saved last week', note: '' },
] as const;

/**
 * The board directory.
 *
 * Every slug here is routable — it is the same six the router accepts, from
 * `config/clover.php`. A directory whose entire purpose is links must not
 * list a board the router will 404, so this stays in step with that config
 * rather than inventing the full board list.
 */
export const BOARD_DIRECTORY: readonly BoardDirectoryEntry[] = [
    {
        slug: '/g/',
        name: 'Technology',
        online: '41,208',
        threads: '18,402',
        category: 'Interests',
        subscribed: true,
        worksafe: true,
        description:
            'Hardware, software and the arguments between them. Homelabs, compilers, and one thread per week about mechanical keyboards.',
    },
    {
        slug: '/wg/',
        name: 'Wallpapers',
        online: '9,114',
        threads: '4,190',
        category: 'Creative',
        subscribed: true,
        worksafe: true,
        description:
            'Wallpaper dumps at native resolution. No upscales, no watermarks, no AI slop.',
    },
    {
        slug: '/biz/',
        name: 'Business',
        online: '12,860',
        threads: '11,067',
        category: 'Work',
        subscribed: false,
        worksafe: true,
        description:
            'Markets, freelancing and small business. Half of it is useful and the other half is someone selling a course.',
    },
    {
        slug: '/x/',
        name: 'Paranormal',
        online: '7,442',
        threads: '9,338',
        category: 'Interests',
        subscribed: true,
        worksafe: true,
        description:
            'Unexplained recordings, missing footage and long transcripts. Sourcing is expected even here.',
    },
    {
        slug: '/fit/',
        name: 'Fitness',
        online: '15,309',
        threads: '13,551',
        category: 'Life',
        subscribed: false,
        worksafe: true,
        description:
            'Training, food and progress logs. Ask about form, expect to be told your form is bad.',
    },
    {
        slug: '/co/',
        name: 'Comics',
        online: '6,027',
        threads: '7,802',
        category: 'Creative',
        subscribed: false,
        worksafe: true,
        description:
            'Comics and animation, print and web. Storyboards, panel layouts and long-running adaptation grudges.',
    },
    {
        slug: '/b/',
        name: 'Random',
        online: '58,730',
        threads: '31,204',
        category: 'Other',
        subscribed: false,
        /**
         * The only board here 4chan marks `ws_board: 0`. It exists in this
         * fixture so the mature-boards setting has something to act on: a
         * filter that cannot change what is on screen is indistinguishable
         * from a broken one, which is why the history range filter was cut.
         */
        worksafe: false,
        description:
            'No topic and no rules beyond the global ones. Adult content, and the reason the mature-boards setting exists.',
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

/**
 * Replies on thread 58210441. Unlike the other fixtures this one has no
 * counterpart in the design prototype, which shows a comment tree without
 * publishing its data. Written here in the same register: dry, specific,
 * technical, and unimpressed.
 *
 * Nesting goes three deep deliberately, so indentation, the depth cap and the
 * collapse affordance all have something real to act on.
 */
export const COMMENTS: readonly Comment[] = [
    {
        no: 58210447,
        quotes: [],
        author: 'Anonymous',
        time: '3 min ago',
        body: 'Forty minutes for LLVM is not "fine", that is a full coffee break per build. What is the core count?',
        blessings: 214,
        op: false,
        replies: [
            {
                no: 58210452,
                quotes: [58210447],
                author: 'Anonymous',
                time: '2 min ago',
                body: 'Eight cores, 16 GB. It is not fast, it is usable. Those are different claims.',
                blessings: 388,
                op: true,
                replies: [
                    {
                        no: 58210461,
                        quotes: [58210452],
                        author: 'Anonymous',
                        time: '1 min ago',
                        body: 'Fair. What is battery like under sustained load?',
                        blessings: 42,
                        op: false,
                        replies: [],
                    },
                ],
            },
            {
                no: 58210455,
                quotes: [58210447],
                author: 'Anonymous',
                time: '2 min ago',
                body: 'Cross compile on an x86 box and rsync the artifacts. Nobody builds LLVM natively on these.',
                blessings: 156,
                op: false,
                replies: [],
            },
        ],
    },
    {
        no: 58210449,
        quotes: [],
        author: 'Anonymous',
        time: '2 min ago',
        body: 'Mainline kernel support or vendor tree? This is the only question that matters and every one of these threads dodges it.',
        blessings: 512,
        op: false,
        replies: [
            {
                no: 58210458,
                quotes: [58210449],
                author: 'Anonymous',
                time: '1 min ago',
                body: 'Vendor tree, 6.6 based. Mainline boots but the GPU does nothing.',
                blessings: 297,
                op: true,
                replies: [],
            },
        ],
    },
    {
        no: 58210463,
        quotes: [],
        author: 'Anonymous',
        time: 'just now',
        body: 'Bought one in April and returned it in May. Your mileage will vary wildly by workload.',
        blessings: 8,
        op: false,
        replies: [],
    },
];
