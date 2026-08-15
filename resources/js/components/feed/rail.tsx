import { MachineValue } from '@/components/clover/machine-value';
import { Panel } from '@/components/clover/panel';
import type { Thread } from '@/types/clover';

/**
 * The feed's sticky sidebar: the rules, what Clover holds, and what is on the
 * page beside it.
 *
 * It opened with trending boards and a list of boards to join. Both moved into
 * the app sidebar, which renders on every screen rather than the three that
 * mount a rail.
 *
 * Then "Moderation notices" and "Recent activity" went. The first said "No
 * notices right now" on every render, because nothing has ever written a
 * notice; the second was empty for every signed-out visitor and for every
 * account that had not done anything yet. Two panels, both permanently blank,
 * holding the height of the feed beside them. What replaced them is counted
 * rather than awaited, so neither can be empty while the site has anything in
 * it at all.
 *
 * What is left is what belongs beside a feed specifically: the rules governing
 * what is in it, what has been moderated, and what this anon has been doing.
 * None of it is navigation, which is the sidebar's job.
 */
const COMMUNITY_RULES = [
    'Post on topic for the board you are on.',
    'No doxxing, no raids, no illegal content.',
    'Spoiler anything that needs it.',
] as const;

/**
 * The three rules, each with the line that says what it actually means.
 *
 * There was a fourth — "Reports are read by janitors, not bots" — and it went.
 * Clover has no report button, no janitor role and no action log, so the line
 * described a moderation system that has never existed. A rule nothing can
 * enforce is worse than a short list.
 *
 * They were bare sentences. A rule a reader has to interpret is a rule
 * they will interpret differently from the janitor reading their report, so
 * each now carries the clarification that was previously left implicit.
 */
const COMMUNITY_RULE_NOTES: readonly string[] = [
    'A thread that would fit any board belongs on none of them.',
    'Personal information, organised brigading and anything unlawful all go on sight.',
    'Clover covers attachments on boards 4chan marks not worksafe, and honours the spoiler flag. Neither replaces judgement.',
];

function CommunityRulesPanel() {
    return (
        <Panel title="Community rules">
            <ol className="flex list-none flex-col gap-3">
                {COMMUNITY_RULES.map((rule, index) => (
                    <li key={rule} className="flex flex-col gap-1">
                        <div className="flex gap-2">
                            <MachineValue className="shrink-0">
                                {index + 1}
                            </MachineValue>
                            <span className="text-meta text-foreground">
                                {rule}
                            </span>
                        </div>
                        <span className="pl-6 text-caption text-pretty text-muted-foreground">
                            {COMMUNITY_RULE_NOTES[index]}
                        </span>
                    </li>
                ))}
            </ol>
        </Panel>
    );
}

/**
 * What Clover currently holds.
 *
 * This replaced "Moderation notices", which said "No notices right now" on
 * every render because nothing has ever written a notice, and it sat above
 * "Recent activity", which was empty for every signed-out visitor and for
 * every account that had not done anything yet. Two panels, both permanently
 * blank, taking up the height of the feed beside them.
 *
 * These figures are counted from the database on every request, so the panel
 * has something to say the moment there is anything in it at all.
 */
function LibraryPanel({ library }: { library: FeedLibrary }) {
    const rows = [
        { label: 'Boards', value: library.boards },
        { label: 'Threads', value: library.threads },
        { label: 'Posts', value: library.posts },
    ];

    return (
        <Panel title="Clover holds">
            <dl className="flex flex-col gap-2">
                {rows.map((row) => (
                    <div key={row.label} className="flex items-baseline gap-2">
                        <dt className="text-meta text-muted-foreground">
                            {row.label}
                        </dt>
                        <dd className="ml-auto">
                            <MachineValue className="text-foreground">
                                {row.value}
                            </MachineValue>
                        </dd>
                    </div>
                ))}
            </dl>

            {/* The sync time is not here.
            
                It answers a question about Clover's plumbing, not about the
                feed beside it, and a reader who wants it has a page that is
                entirely about it: /status. Three counted figures are what this
                panel is for. */}
        </Panel>
    );
}

/**
 * What is on the screen right now, derived from the threads the page was
 * given rather than fetched. It cannot be empty when the feed is not, which is
 * the whole complaint about the panels this replaced.
 */
function ThisFeedPanel({ threads }: { threads: readonly Thread[] }) {
    const boards = new Set(threads.map((thread) => thread.board));
    const withImages = threads.filter((thread) => thread.media !== null).length;
    const replies = threads.reduce(
        (total, thread) => total + thread.replies,
        0,
    );

    const rows = [
        { label: 'Threads shown', value: threads.length },
        { label: 'Boards represented', value: boards.size },
        { label: 'Carrying an image', value: withImages },
        { label: 'Replies between them', value: replies },
    ];

    return (
        <Panel title="On this page">
            <dl className="flex flex-col gap-2">
                {rows.map((row) => (
                    <div key={row.label} className="flex items-baseline gap-2">
                        <dt className="text-meta text-muted-foreground">
                            {row.label}
                        </dt>
                        <dd className="ml-auto">
                            <MachineValue className="text-foreground">
                                {row.value.toLocaleString('en-GB')}
                            </MachineValue>
                        </dd>
                    </div>
                ))}
            </dl>
        </Panel>
    );
}

type FeedLibrary = {
    boards: string;
    threads: string;
    posts: string;
    lastSyncedAt: string | null;
};

type RailProps = {
    /** Counted server-side, within this anon's own visibility. */
    library: FeedLibrary;
    /** The threads on screen, so the last panel describes what is actually there. */
    threads: readonly Thread[];
};

function Rail({ library, threads }: RailProps) {
    return (
        <aside
            aria-label="Community sidebar"
            data-slot="feed-rail"
            className="sticky top-22 hidden w-(--measure-rail) shrink-0 flex-col gap-3.5 self-start lg:flex"
        >
            <CommunityRulesPanel />
            <LibraryPanel library={library} />
            <ThisFeedPanel threads={threads} />
        </aside>
    );
}

export { Rail };
export type { FeedLibrary };
