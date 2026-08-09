import { Link } from '@inertiajs/react';
import {
    ArrowBigUpIcon,
    BookmarkIcon,
    CheckIcon,
    CircleIcon,
    MessageSquareIcon,
    ShieldIcon,
    TriangleAlertIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { AnonAvatar } from '@/components/clover/anon-avatar';
import { BoardAvatar } from '@/components/clover/board-avatar';
import { MachineValue } from '@/components/clover/machine-value';
import { Panel } from '@/components/clover/panel';
import { Button } from '@/components/ui/button';
import { ACTIVITY, BOARDS, TRENDING } from '@/fixtures/clover';
import { cn } from '@/lib/utils';
import { communities, search } from '@/routes';
import type { BoardSlug } from '@/types/clover';

/**
 * The feed's sticky sidebar: trending tags, a handful of boards, the rules,
 * a moderation notice, who is online, and recent activity. Six panels, one
 * `aside`, no props: every other page composing the feed reaches into the
 * same fixtures rather than this component taking them as input.
 */

const POPULAR_BOARDS_COUNT = 4;
const ONLINE_AVATAR_COUNT = 5;
const ONLINE_COUNT = '228,025 anons online';

const COMMUNITY_RULES = [
    'Post on topic for the board you are on.',
    'No doxxing, no raids, no illegal content.',
    'Spoiler anything that needs it.',
    'Reports are read by janitors, not bots.',
] as const;

/**
 * `ActivityEntry.icon` is a Lucide icon name carried as a plain string so the
 * fixture (and the server-driven data that replaces it later) stays
 * framework-agnostic. An unrecognised name falls back to a plain circle: a
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

function TrendingPanel() {
    return (
        <Panel title="Trending topics">
            <ul role="list" className="flex flex-col gap-1">
                {TRENDING.map((item, index) => (
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

function PopularBoardsPanel() {
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
                {BOARDS.slice(0, POPULAR_BOARDS_COUNT).map((board) => {
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
                                    {`${board.slug} · ${board.online} online`}
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
            <div
                role="note"
                className="flex items-start gap-2.5 rounded-md border border-warning-line bg-warning-soft p-3"
            >
                <TriangleAlertIcon
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-warning"
                />
                <p className="text-body-sm text-foreground">
                    /biz/ is under slow mode until 18:00 UTC. One post per anon
                    every 5 minutes.
                </p>
            </div>
        </Panel>
    );
}

/**
 * The avatars are one decorative unit standing in for the count already
 * spelled out in the `MachineValue` beside them. `AnonAvatar` without a
 * `label` renders `aria-hidden` on its own, so the stack never reaches
 * assistive technology as five separate images.
 */
function WhoIsOnlinePanel() {
    return (
        <Panel title="Who is online">
            <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                    {Array.from({ length: ONLINE_AVATAR_COUNT }, (_, index) => (
                        <AnonAvatar
                            key={index}
                            seed={`rail-online-${index}`}
                            size={26}
                            className="border-2 border-surface"
                        />
                    ))}
                </div>
                <MachineValue>{ONLINE_COUNT}</MachineValue>
            </div>
        </Panel>
    );
}

function RecentActivityPanel() {
    return (
        <Panel title="Recent activity">
            <ul role="list" className="flex flex-col gap-3">
                {ACTIVITY.map((entry, index) => {
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

function Rail() {
    return (
        <aside
            aria-label="Community sidebar"
            data-slot="feed-rail"
            className="sticky top-22 hidden w-[330px] shrink-0 flex-col gap-3.5 self-start lg:flex"
        >
            <TrendingPanel />
            <PopularBoardsPanel />
            <CommunityRulesPanel />
            <ModerationNoticesPanel />
            <WhoIsOnlinePanel />
            <RecentActivityPanel />
        </aside>
    );
}

export { activityIconFor, Rail };
