import type {
    ActivityEntry,
    Board,
    Comment,
    HistoryEntry,
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
