import { Link } from '@inertiajs/react';
import {
    ArrowBigUp,
    Bookmark,
    CircleDot,
    Flame,
    History,
    MessageSquare,
    Shield,
    Star,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { MachineValue } from '@/components/clover/machine-value';
import { SectionLabel } from '@/components/clover/section-label';
import { ThreadCard } from '@/components/clover/thread-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ACHIEVEMENTS, ACTIVITY, BOARDS, THREADS } from '@/fixtures/clover';
import { cn } from '@/lib/utils';
import { board, communities } from '@/routes';

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
function AccountOverview() {
    const topThread = THREADS[4];

    return (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
            <div className="flex min-w-0 flex-col gap-5">
                <OverviewSection title="Recent activity">
                    <Card className="gap-0 py-0">
                        {ACTIVITY.map((entry, index) => {
                            const Icon = iconFor(entry.icon);

                            return (
                                <div
                                    key={entry.text}
                                    className={cn(
                                        'flex items-center gap-3 px-[18px] py-3.5',
                                        index < ACTIVITY.length - 1 &&
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
                    <ThreadCard thread={topThread} />
                </OverviewSection>
            </div>

            <div className="flex min-w-0 flex-col gap-5">
                <OverviewSection title="Achievements">
                    <Card className="gap-3.5 py-4">
                        {ACHIEVEMENTS.map((achievement) => {
                            const Icon = iconFor(achievement.icon);

                            return (
                                <div
                                    key={achievement.title}
                                    className="flex items-center gap-3 px-5"
                                >
                                    <span
                                        aria-hidden="true"
                                        className="grid size-8 shrink-0 place-items-center rounded-lg border border-primary-line bg-primary-soft text-primary"
                                    >
                                        <Icon className="size-4" />
                                    </span>
                                    <div className="flex min-w-0 flex-col">
                                        <span className="text-body-sm text-foreground">
                                            {achievement.title}
                                        </span>
                                        <MachineValue>
                                            {achievement.meta}
                                        </MachineValue>
                                    </div>
                                </div>
                            );
                        })}
                    </Card>
                </OverviewSection>

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
                            {BOARDS.map((entry) => (
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
