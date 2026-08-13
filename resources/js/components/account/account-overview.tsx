import { Link, usePage } from '@inertiajs/react';
import {
    ArrowBigUp,
    Bookmark,
    CircleDot,
    Flame,
    History,
    MessageSquare,
    Shield,
    Sparkles as SparklesIcon,
    Star,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/clover/empty-state';
import { MachineValue } from '@/components/clover/machine-value';
import { SectionLabel } from '@/components/clover/section-label';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { board, communities } from '@/routes';
import type { ActivityEntry } from '@/types/clover';

/**
 * Fixture icons arrive as kebab-case lucide names. The lookup is an explicit
 * object rather than an index into the `lucide-react` namespace: a dynamic
 * lookup by string defeats tree-shaking, pulling the whole icon set into the
 * bundle, and cannot be typed against a `string` key.
 */
const FIXTURE_ICONS: Record<string, LucideIcon | undefined> = {
    'arrow-big-up': ArrowBigUp,
    bookmark: Bookmark,
    flame: Flame,
    history: History,
    'message-square': MessageSquare,
    shield: Shield,
    star: Star,
};

/** An unmapped name still renders a glyph rather than a hole in the row. */
function iconFor(name: string): LucideIcon {
    return FIXTURE_ICONS[name] ?? CircleDot;
}

/** `/g/` becomes `g`, the bare form the `board` route expects. */
function boardToken(slug: string): string {
    return slug.replaceAll('/', '');
}

/**
 * A labelled region of the overview.
 *
 * The label sits above the card rather than inside it, which is what
 * separates this from `Panel`: these cards are full-bleed lists whose rows
 * carry their own dividers, and `Panel`'s padded `CardContent` would inset
 * them away from the card edge. The wrapper is still a real `section` so the
 * region is reachable as a landmark either way.
 */
function OverviewSection({
    title,
    action,
    children,
}: {
    title: string;
    action?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section aria-label={title} className="flex flex-col gap-2.5">
            <SectionLabel action={action}>{title}</SectionLabel>
            {children}
        </section>
    );
}

/**
 * The account screen's default tab: what this anon has been doing, what they
 * have earned, their best thread and the boards they follow.
 */
type AccountOverviewProps = {
    /**
     * What this anon has been doing, derived from their own record.
     *
     * The fixture mixed things done *to* them with things they did — "Anonymous
     * replied to your post", "Your report was actioned". Neither has a source:
     * there is no reporting system, and a reply is not addressed to an account.
     */
    activity: readonly ActivityEntry[];
};

function AccountOverview({ activity }: AccountOverviewProps) {
    /* Boards come from the shared prop the sidebar also reads, so this list is
       real boards filtered by the anon's own content settings rather than a
       fixture. Which boards an anon actually follows is a subscription, and
       subscriptions are task 11b. */
    const { sidebarBoards } = usePage().props;

    return (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
            <div className="flex min-w-0 flex-col gap-5">
                <OverviewSection title="Recent activity">
                    <Card className="gap-0 py-0">
                        {activity.map((entry, index) => {
                            const Icon = iconFor(entry.icon);

                            return (
                                <div
                                    key={entry.text}
                                    className={cn(
                                        'flex items-center gap-3 px-[18px] py-3.5',
                                        index < activity.length - 1 &&
                                            'border-b border-border',
                                    )}
                                >
                                    <Icon
                                        aria-hidden="true"
                                        className="size-4 shrink-0 text-faint"
                                    />
                                    <span className="min-w-0 flex-1 text-body-sm text-foreground">
                                        {entry.text}
                                    </span>
                                    <MachineValue className="shrink-0">
                                        {entry.time}
                                    </MachineValue>
                                </div>
                            );
                        })}
                    </Card>
                </OverviewSection>

                <OverviewSection title="Top thread">
                    {/* The anon's best thread needs posts attributed to an
                        anon, and nothing attributes them yet — authorship
                        arrives with posting in task 11b. It used to render a
                        fixture thread, which claimed this anon wrote something
                        they did not. An empty state says the true thing. */}
                    <EmptyState
                        icon={<SparklesIcon />}
                        title="No threads yet"
                        body="Threads you start appear here."
                    />
                </OverviewSection>
            </div>

            <div className="flex min-w-0 flex-col gap-5">
                <OverviewSection
                    title="Boards"
                    action={
                        <Link
                            href={communities()}
                            className="text-caption text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                        >
                            Manage
                        </Link>
                    }
                >
                    <Card className="py-4">
                        <div className="grid grid-cols-3 gap-2 px-5">
                            {sidebarBoards.map((entry) => (
                                <Button
                                    key={entry.slug}
                                    variant="outline"
                                    size="sm"
                                    pill
                                    className="w-full"
                                    asChild
                                >
                                    <Link
                                        href={board({
                                            board: boardToken(entry.slug),
                                        })}
                                    >
                                        {entry.slug}
                                    </Link>
                                </Button>
                            ))}
                        </div>
                    </Card>
                </OverviewSection>
            </div>
        </div>
    );
}

export { AccountOverview };
