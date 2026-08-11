import { Link } from '@inertiajs/react';
import { Settings, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AnonAvatar } from '@/components/clover/anon-avatar';
import { MachineValue } from '@/components/clover/machine-value';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn, toUrl } from '@/lib/utils';
import { account } from '@/routes';
import { edit as editProfile } from '@/routes/profile';
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

/** How long "Link copied" stays on the Share button before it reverts. */
const COPIED_FEEDBACK_MS = 2000;

type ProfileHeaderProps = {
    profile: Profile;
    stats: readonly ProfileStat[];
};

/**
 * `Joined 14 Mar 2024 · Janitor scope: /g/, /wg/`, or just the joined date
 * for an anon who janitors nothing. An empty scope must not leave a trailing
 * separator pointing at nothing.
 */
function metaLine(profile: Profile): string {
    const joined = `Joined ${profile.joined}`;

    if (profile.janitorScope.length === 0) {
        return joined;
    }

    return `${joined} · Janitor scope: ${profile.janitorScope.join(', ')}`;
}

function ProfileHeader({ profile, stats }: ProfileHeaderProps) {
    const [copied, setCopied] = useState(false);

    /**
     * The label reverts on a timer rather than staying changed forever. The
     * cleanup is what keeps the state update from landing after unmount.
     */
    useEffect(() => {
        if (!copied) {
            return;
        }

        const timer = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);

        return () => clearTimeout(timer);
    }, [copied]);

    /**
     * Sharing writes the profile URL to the clipboard. There is no share
     * backend and no native share sheet to fall back on here, and a button
     * that does nothing at all is worse than one that does the small real
     * thing an anon actually wanted.
     */
    function copyProfileLink(): void {
        const url = `${window.location.origin}${toUrl(account())}`;

        navigator.clipboard
            ?.writeText(url)
            .then(() => setCopied(true))
            /* A refused clipboard permission does not deserve an error
               surface. The label simply does not change. */
            .catch(() => setCopied(false));
    }

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

                        {profile.janitorScope.length > 0 ? (
                            <Badge tone="primary">Janitor</Badge>
                        ) : null}

                        {profile.tripcode ? (
                            <MachineValue>{profile.tripcode}</MachineValue>
                        ) : null}
                    </div>

                    <p className="max-w-[560px] text-body-sm text-pretty text-muted-foreground">
                        {profile.bio}
                    </p>

                    <MachineValue>{metaLine(profile)}</MachineValue>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" onClick={copyProfileLink}>
                        <Share2 aria-hidden="true" />
                        {copied ? 'Link copied' : 'Share'}
                    </Button>

                    {/* Clover has one settings surface, at /settings/profile.
                        Editing here too would be a second place to change the
                        same fields, which is how the two drift apart. */}
                    <Button asChild>
                        <Link href={editProfile()}>
                            <Settings aria-hidden="true" />
                            Edit profile
                        </Link>
                    </Button>
                </div>
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
