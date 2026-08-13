import { usePage } from '@inertiajs/react';
import {
    ArrowBigUpIcon,
    BookmarkIcon,
    CircleIcon,
    MessageSquareIcon,
    ShieldIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { MachineValue } from '@/components/clover/machine-value';
import { Panel } from '@/components/clover/panel';

/**
 * The feed's sticky sidebar: community rules, moderation notices, and this
 * anon's recent activity.
 *
 * It opened with trending boards and a list of boards to join. Both moved into
 * the app sidebar, which renders on every screen rather than the three that
 * mount a rail, so the two lists now reach the whole product instead of the
 * feed, popular and latest.
 *
 * What is left is what belongs beside a feed specifically: the rules governing
 * what is in it, what has been moderated, and what this anon has been doing.
 * None of it is navigation, which is the sidebar's job.
 */
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

function Rail() {
    return (
        <aside
            aria-label="Community sidebar"
            data-slot="feed-rail"
            className="sticky top-22 hidden w-[330px] shrink-0 flex-col gap-3.5 self-start lg:flex"
        >
            <CommunityRulesPanel />
            <ModerationNoticesPanel />
            <RecentActivityPanel />
        </aside>
    );
}

export { activityIconFor, Rail };
