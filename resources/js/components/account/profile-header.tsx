import { EditProfileDialog } from '@/components/account/edit-profile-dialog';
import { AnonAvatar } from '@/components/clover/anon-avatar';
import { MachineValue } from '@/components/clover/machine-value';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Profile, ProfileStat } from '@/types/clover';

/**
 * The identity block at the top of the account screen: cover, avatar, name,
 * bio and the counted figures.
 *
 * The gridline overlay names `--color-border` rather than `--border`: the
 * latter is not a custom property this stylesheet defines, so a gradient
 * referencing it is invalid and the whole overlay silently disappears.
 */
const COVER_GRID = {
    backgroundImage: [
        'repeating-linear-gradient(to right, var(--color-border) 0, var(--color-border) 1px, transparent 1px, transparent 48px)',
        'repeating-linear-gradient(to bottom, var(--color-border) 0, var(--color-border) 1px, transparent 1px, transparent 48px)',
    ].join(', '),
};

type ProfileHeaderProps = {
    profile: Profile;
    stats: readonly ProfileStat[];
};

/**
 * The join date, and nothing else.
 *
 * It read `Joined 14 Mar 2024 · Janitor scope: /g/, /wg/` while the profile was
 * a fixture. Janitor scope named a moderation system that does not exist —
 * there is no report queue, no janitor role and nothing to be in scope of — so
 * the badge and this half of the line went with it.
 */
function metaLine(profile: Profile): string {
    return `Joined ${profile.joined}`;
}

function ProfileHeader({ profile, stats }: ProfileHeaderProps) {
    return (
        <Card className="gap-0 overflow-hidden py-0">
            <div
                aria-hidden="true"
                className="h-[132px] border-b border-border bg-surface-elevated"
            >
                <div className="h-full w-full opacity-60" style={COVER_GRID} />
            </div>

            <div className="flex flex-wrap items-end gap-5 px-6 pb-[22px]">
                <AnonAvatar
                    seed={profile.handle}
                    size={84}
                    className="-mt-[38px] rounded-full border-4 border-surface"
                />

                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="font-display text-h1 font-semibold text-foreground">
                            {profile.handle}
                        </h1>

                        {profile.tripcode ? (
                            <MachineValue>{profile.tripcode}</MachineValue>
                        ) : null}
                    </div>

                    <p className="max-w-[560px] text-body-sm text-pretty text-muted-foreground">
                        {profile.bio}
                    </p>

                    <MachineValue>{metaLine(profile)}</MachineValue>
                </div>

                {/* A dialog over the profile rather than a link to
                    settings. It used to navigate to the settings form, which
                    edited the account's name and email -- neither of which this
                    page shows -- so the one button promising to change what a
                    reader was looking at changed nothing they could see.

                    Share went with it. It copied a link to `/account`, which is
                    whichever anon is signed in, so the "shared" link showed the
                    recipient their own profile rather than the sender's. A
                    button that reliably sends the wrong thing is worse than no
                    button at all. */}
                <EditProfileDialog profile={profile} />
            </div>

            <dl className="flex flex-wrap border-t border-border">
                {stats.map((stat, index) => (
                    <div
                        key={stat.label}
                        className={cn(
                            'flex flex-1 basis-40 flex-col-reverse gap-0.5 px-5 py-3.5',
                            index > 0 && 'border-l border-border',
                        )}
                    >
                        {/* `dt` must precede its `dd` in the DOM; the column
                            is reversed visually so the figure still sits
                            above its label. */}
                        <dt className="text-caption text-faint">
                            {stat.label}
                        </dt>
                        <dd>
                            <MachineValue className="text-h2 text-foreground">
                                {stat.value}
                            </MachineValue>
                        </dd>
                    </div>
                ))}
            </dl>
        </Card>
    );
}

export { ProfileHeader };
export type { ProfileHeaderProps };
