import { Link, usePage } from '@inertiajs/react';
import {
    ArrowBigUpIcon,
    BookmarkIcon,
    CheckIcon,
    CircleIcon,
    MessageSquareIcon,
    ShieldIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { BoardAvatar } from '@/components/clover/board-avatar';
import { MachineValue } from '@/components/clover/machine-value';
import { Panel } from '@/components/clover/panel';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { communities, search } from '@/routes';
import type { Board, BoardSlug, TrendingTag } from '@/types/clover';

/**
 * The feed's sticky sidebar: trending boards, a handful of boards to join, the
 * rules, moderation notices, and recent activity.
 *
 * It used to take no props and read the fixtures directly, which was
 * deliberate while there was no server to ask. There is one now, and the feed
 * page passes down boards and trending figures the database actually counted.
 *
 * Two panels did not survive contact with the real data source.
 *
 * "Who is online" is gone. Its entire content was `228,025 anons online` and a
 * row of decorative avatars, and 4chan's JSON API publishes no presence figure
 * at any scope — not per board, not site-wide. There is no honest version of
 * that panel, not even an empty one, because the panel *was* the number.
 *
 * "Moderation notices" kept its place but lost its content. It claimed /biz/
 * was under slow mode until 18:00 UTC, which is a specific false statement
 * about a live board now that /biz/ is a real board. Nothing upstream reports
 * moderation state, so it renders an honest empty state instead — the same
 * choice the footer's unwritten pages got, for the same reason: removing the
 * affordance hides it from screen-reader navigation and makes the rail read as
 * broken, while leaving the copy in place would simply be a lie.
 *
 * Recent activity comes from the shared props, derived from this anon's own
 * record. It is empty for a signed-out anon, who has done nothing here.
 */

const POPULAR_BOARDS_COUNT = 4;

const COMMUNITY_RULES = [
    'Post on topic for the board you are on.',
    'No doxxing, no raids, no illegal content.',
    'Spoiler anything that needs it.',
    'Reports are read by janitors, not bots.',
] as const;

/**
 * `ActivityEntry.icon` is a Lucide icon name carried as a plain string so the
 * payload stays framework-agnostic. An unrecognised name falls back to a plain circle: a
 * neutral marker that does not claim a meaning the data never promised,
 * unlike e.g. a bell or a warning glyph.
 */
const ACTIVITY_ICONS: Record<string, LucideIcon> = {
    'message-square': MessageSquareIcon,
    'arrow-big-up': ArrowBigUpIcon,
    shield: ShieldIcon,
    bookmark: BookmarkIcon,
};

function activityIconFor(name: string): LucideIcon {
    return ACTIVITY_ICONS[name] ?? CircleIcon;
}

const rowLinkClasses = cn(
    'flex items-center gap-2 rounded-md px-1 py-1.5',
    'transition-colors duration-[var(--duration-hover)] ease-standard hover:bg-surface-hover',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
);

const actionLinkClasses = cn(
    'text-caption font-medium text-accent-text',
    'transition-colors duration-[var(--duration-hover)] ease-standard hover:text-primary-hover',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
);

/**
 * Titled "Trending boards", not "Trending topics".
 *
 * The rows are boards now. 4chan has no topic field, no tags and nothing to
 * aggregate into one, so the fixture's `risc-v` and `homelab` could only have
 * been reproduced by inventing them on every render. Busiest boards is the
 * real quantity nearest to what the panel was showing, and calling it what it
 * is costs nothing.
 */
function TrendingPanel({ trending }: { trending: TrendingTag[] }) {
    return (
        <Panel title="Trending boards">
            <ul role="list" className="flex flex-col gap-1">
                {trending.map((item, index) => (
                    <li key={item.tag}>
                        <Link
                            href={search({ query: { tag: item.tag } }).url}
                            aria-label={item.tag}
                            className={rowLinkClasses}
                        >
                            <MachineValue className="w-[2ch] shrink-0 text-right">
                                {index + 1}
                            </MachineValue>
                            <span className="flex-1 truncate text-body-sm text-foreground">
                                {item.tag}
                            </span>
                            <MachineValue className="shrink-0">
                                {item.posts}
                            </MachineValue>
                        </Link>
                    </li>
                ))}
            </ul>
        </Panel>
    );
}

function PopularBoardsPanel({ boards }: { boards: Board[] }) {
    const [joined, setJoined] = useState<Partial<Record<BoardSlug, boolean>>>(
        {},
    );

    function toggleJoined(slug: BoardSlug) {
        setJoined((previous) => ({ ...previous, [slug]: !previous[slug] }));
    }

    return (
        <Panel
            title="Popular boards"
            action={
                <Link href={communities()} className={actionLinkClasses}>
                    All
                </Link>
            }
        >
            <ul role="list" className="flex flex-col gap-3">
                {boards.slice(0, POPULAR_BOARDS_COUNT).map((board) => {
                    const isJoined = joined[board.slug] ?? false;

                    return (
                        <li
                            key={board.slug}
                            className="flex items-center gap-2.5"
                        >
                            <BoardAvatar
                                slug={board.slug}
                                size={30}
                                decorative
                            />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-body-sm text-foreground">
                                    {board.name}
                                </p>
                                <MachineValue>
                                    {`${board.slug} · ${board.threads} threads`}
                                </MachineValue>
                            </div>
                            <Button
                                type="button"
                                variant={isJoined ? 'outline' : 'primary'}
                                size="sm"
                                pill
                                aria-pressed={isJoined}
                                onClick={() => toggleJoined(board.slug)}
                                className="shrink-0 px-3"
                            >
                                {isJoined ? (
                                    <>
                                        <CheckIcon
                                            aria-hidden="true"
                                            className="size-3.5"
                                        />
                                        Joined
                                    </>
                                ) : (
                                    'Join'
                                )}
                            </Button>
                        </li>
                    );
                })}
            </ul>
        </Panel>
    );
}

function CommunityRulesPanel() {
    return (
        <Panel title="Community rules">
            <ol className="list-decimal space-y-1.5 pl-4 text-meta text-muted-foreground">
                {COMMUNITY_RULES.map((rule) => (
                    <li key={rule}>{rule}</li>
                ))}
            </ol>
        </Panel>
    );
}

/**
 * A coloured box carries state through colour alone, which the taste laws
 * forbid. `role="note"` is what actually fixes that: it names the region a
 * notice to assistive technology independently of the warning tint, and the
 * icon stays `aria-hidden` since it repeats what the role already says.
 */
function ModerationNoticesPanel() {
    return (
        <Panel title="Moderation notices">
            <p className="text-body-sm text-muted-foreground">
                No notices right now.
            </p>
        </Panel>
    );
}

function RecentActivityPanel() {
    const { recentActivity } = usePage().props;

    return (
        <Panel title="Recent activity">
            <ul role="list" className="flex flex-col gap-3">
                {recentActivity.map((entry, index) => {
                    const Icon = activityIconFor(entry.icon);

                    return (
                        <li
                            key={`${entry.time}-${index}`}
                            className="flex items-start gap-2.5"
                        >
                            <Icon
                                aria-hidden="true"
                                className="mt-0.5 size-4 shrink-0 text-faint"
                            />
                            <span className="flex-1 text-meta text-muted-foreground">
                                {entry.text}
                            </span>
                            <MachineValue className="shrink-0">
                                {entry.time}
                            </MachineValue>
                        </li>
                    );
                })}
            </ul>
        </Panel>
    );
}

type RailProps = {
    /** The busiest boards, chosen and counted server-side. */
    boards: Board[];
    /** Busiest boards by post total, in the shape the strip already rendered. */
    trending: TrendingTag[];
};

function Rail({ boards, trending }: RailProps) {
    return (
        <aside
            aria-label="Community sidebar"
            data-slot="feed-rail"
            className="sticky top-22 hidden w-[330px] shrink-0 flex-col gap-3.5 self-start lg:flex"
        >
            <TrendingPanel trending={trending} />
            <PopularBoardsPanel boards={boards} />
            <CommunityRulesPanel />
            <ModerationNoticesPanel />
            <RecentActivityPanel />
        </aside>
    );
}

export { activityIconFor, Rail };
