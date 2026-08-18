import { EditProfileDialog } from '@/components/account/edit-profile-dialog';
import { SettingsDrawer } from '@/components/account/settings-drawer';
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
            /* Boxed at `md` and up, ruled below it. A border around the top
               of a page built on hairlines is a card inside a card, and on a
               320px screen its two side borders are spent on nothing. */
            className="md:border md:border-border"
        >
            <PatternField depth={40}>
                {/* A column of rows, not one wrapping row.

                    Avatar, name and the chip all sat in a single
                    `flex-wrap` row, and the chip does not shrink: between
                    roughly 340px and 440px it stayed on the first line and
                    squeezed the text column to almost nothing, so the handle
                    ran under the chip and the bio broke mid-word -- "Just
                    wonderi / ng / aroun / d". Nothing wraps its way out of
                    that, because the column had no width left to wrap in.

                    So the identity line is avatar + name only, and the bio
                    and the chip each get a row of their own beneath it.
                    Nothing on this block competes for horizontal space with
                    anything that cannot yield. */}
                <div className="flex flex-col gap-4 border-b border-border p-4 md:p-6">
                    {/* Square, and in the flow. It used to be a circle
                        overhanging the bottom edge of a cover band, which is
                        a shape that only makes sense when there is a
                        photograph behind it. */}
                    <div className="flex items-start gap-4">
                        <AnonAvatar
                            seed={profile.handle}
                            size={72}
                            className="shrink-0 rounded-none border border-border"
                        />

                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                            <div className="flex flex-wrap items-baseline gap-3">
                                {/* `min-w-0` and `break-words`: a handle is
                                    one unbroken token by construction, so
                                    without them it sets the column's minimum
                                    width and pushes everything beside it off
                                    the screen. */}
                                <h1 className="min-w-0 font-display text-h1 font-semibold tracking-[-0.5px] break-words text-foreground">
                                    {profile.handle}
                                </h1>

                                {profile.tripcode ? (
                                    <MachineValue className="border border-border px-1.5 py-0.5">
                                        {profile.tripcode}
                                    </MachineValue>
                                ) : null}
                            </div>

                            <MachineValue>{metaLine(profile)}</MachineValue>
                        </div>
                    </div>

                    {profile.bio ? (
                        /* `break-words`, because a bio is whatever an anon
                           typed and an anon can type "HAHAHAHAHAHAHAHAHA"
                           with no space in it. A single unbroken word has
                           nowhere to wrap, so it ran out of its column and
                           past the edge of the block. It gets the full
                           measure now rather than whatever the chip beside it
                           left over, which is what made it break mid-word. */
                        <p className="max-w-[60ch] text-body-sm text-pretty break-words text-muted-foreground">
                            {profile.bio}
                        </p>
                    ) : null}

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
                    {/* The chip and, below `md`, a settings control beside
                        it. Gabe's decision, 2026-08-17: settings are not part
                        of a profile, they are what an anon goes to from one,
                        so they open in a drawer rather than sitting stacked
                        at the foot of this page. At `md` and up the avatar
                        dropdown still carries them and this control does not
                        render. */}
                    <div className="flex items-center gap-2 self-start">
                        <EditProfileDialog profile={profile} />
                        <SettingsDrawer />
                    </div>
                </div>

                {/* The figures, at the size figures deserve when they are the
                    content rather than a caption on it. Label under value, so
                    the eye lands on the number first; `dt` still precedes its
                    `dd` in the DOM, which is what the reversed column is for. */}
                {/* A grid, not a wrapping flex row. `flex-wrap` with a
                    basis dropped the third figure onto its own line somewhere
                    around 340px -- two up, one below, which reads as a
                    mistake rather than a layout. `auto-fit` with a zero
                    minimum keeps however many figures there are on one line
                    at every width. */}
                <dl className="grid grid-cols-[repeat(auto-fit,minmax(0,1fr))]">
                    {stats.map((stat, index) => (
                        <div
                            key={stat.label}
                            /* `basis-0` below `md`, so three short numbers
                               share one row on a phone. `basis-40` is 160px:
                               at 320px each figure claimed more than half the
                               row, the three of them stacked, and the block
                               spent roughly 250px before the tabs came into
                               view. The wider basis returns at `md`, where
                               there is room for it. */
                            /* `px-2` at the narrow end, and it is not a taste
                               call: at 320px three columns are ~106px each,
                               `px-3` left 82px of that for the label, and
                               "BOOKMARKS" — nine characters at `text-label`
                               with 1.2px of tracking — needs about 78px. It
                               was clipped at the right edge. `px-2` leaves
                               90px, which fits it with room; the wider
                               padding returns as soon as there is width to
                               spend on it. */
                            className={cn(
                                'flex min-w-0 flex-col-reverse gap-1 px-2 py-4 sm:px-3 md:px-6 md:py-5',
                                index > 0 && 'border-l border-border',
                            )}
                        >
                            <dt>
                                <SectionLabel>{stat.label}</SectionLabel>
                            </dt>
                            <dd>
                                <MachineValue className="font-display text-[22px] leading-none font-semibold text-foreground md:text-[28px]">
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
