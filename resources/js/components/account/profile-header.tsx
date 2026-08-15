import { EditProfileDialog } from '@/components/account/edit-profile-dialog';
import { AnonAvatar } from '@/components/clover/anon-avatar';
import { MachineValue } from '@/components/clover/machine-value';
import { PatternField } from '@/components/clover/pattern-field';
import { SectionLabel } from '@/components/clover/section-label';
import { cn } from '@/lib/utils';
import type { Profile, ProfileStat } from '@/types/clover';

/**
 * The identity block at the top of the account screen.
 *
 * ## What it was
 *
 * A rounded `Card` with a 132px empty band across the top, a circular avatar
 * hanging off its edge, and a three-up figure row underneath. It was the one
 * component on the site still built like a social profile from 2016: a cover
 * photo with no photo, a ruled overlay that belonged to no other screen, and a
 * card border wrapping content that is already the top of the page.
 *
 * The empty band was the worst of it. A cover area exists to hold an image an
 * anon chose; Clover has no such image and never will, so it was 132 pixels of
 * nothing dressed up as a feature — and the grid drawn over it was a second
 * pattern system competing with the dot matrix everything else sits on.
 *
 * ## What it is
 *
 * The same paper as the rest of the site, ruled rather than boxed. The band is
 * `PatternField` at the depth the homepage bands use, so it reads as part of
 * the surface instead of a slab laid on top of one. The avatar is square and
 * sits in the flow rather than overhanging a boundary that no longer exists.
 *
 * The figures are the point of the block, so they are set at display size with
 * a tracked label under each and a hard rule between them. That is what the
 * brutalist register is actually for here: the numbers are the content, and
 * they are counted rather than decorated.
 */
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
        <section
            aria-label="Profile"
            data-slot="profile-header"
            className="border border-border"
        >
            <PatternField depth={40}>
                <div className="flex flex-wrap items-start gap-5 border-b border-border p-6">
                    {/* Square, and in the flow. It used to be a circle
                        overhanging the bottom edge of a cover band, which is
                        a shape that only makes sense when there is a
                        photograph behind it. */}
                    <AnonAvatar
                        seed={profile.handle}
                        size={72}
                        className="shrink-0 rounded-none border border-border"
                    />

                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <div className="flex flex-wrap items-baseline gap-3">
                            <h1 className="font-display text-h1 font-semibold tracking-[-0.5px] text-foreground">
                                {profile.handle}
                            </h1>

                            {profile.tripcode ? (
                                <MachineValue className="border border-border px-1.5 py-0.5">
                                    {profile.tripcode}
                                </MachineValue>
                            ) : null}
                        </div>

                        {profile.bio ? (
                            <p className="max-w-[60ch] text-body-sm text-pretty text-muted-foreground">
                                {profile.bio}
                            </p>
                        ) : null}

                        <MachineValue>{metaLine(profile)}</MachineValue>
                    </div>

                    {/* A dialog over the profile rather than a link to
                        settings. It used to navigate to the settings form,
                        which edited the account's name and email -- neither of
                        which this page shows -- so the one button promising to
                        change what a reader was looking at changed nothing
                        they could see.

                        Share went with it. It copied a link to `/account`,
                        which is whichever anon is signed in, so the "shared"
                        link showed the recipient their own profile rather than
                        the sender's. */}
                    <EditProfileDialog profile={profile} />
                </div>

                {/* The figures, at the size figures deserve when they are the
                    content rather than a caption on it. Label under value, so
                    the eye lands on the number first; `dt` still precedes its
                    `dd` in the DOM, which is what the reversed column is for. */}
                <dl className="flex flex-wrap">
                    {stats.map((stat, index) => (
                        <div
                            key={stat.label}
                            className={cn(
                                'flex flex-1 basis-40 flex-col-reverse gap-1 px-6 py-5',
                                index > 0 && 'border-l border-border',
                            )}
                        >
                            <dt>
                                <SectionLabel>{stat.label}</SectionLabel>
                            </dt>
                            <dd>
                                <MachineValue className="font-display text-[28px] leading-none font-semibold text-foreground">
                                    {stat.value}
                                </MachineValue>
                            </dd>
                        </div>
                    ))}
                </dl>
            </PatternField>
        </section>
    );
}

export { ProfileHeader };
export type { ProfileHeaderProps };
