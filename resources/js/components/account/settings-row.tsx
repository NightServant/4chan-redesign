import { Link } from '@inertiajs/react';
import { ChevronRightIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

/**
 * One row of the account screen's settings list, below `md`.
 *
 * These were three controls in three idioms stacked on top of each other: a
 * switch, a full-width outlined button, and a full-width filled destructive
 * button. Read together they said the loudest thing on the screen was signing
 * out, that two-factor was its equal, and that the switch above them belonged
 * to something else.
 *
 * A row instead: leading icon, label, trailing chevron. It is quieter, it
 * scans, and a fourth setting can join it without anything being redesigned —
 * which is the actual test of a list, since this one has grown twice already.
 *
 * Destructive colour is deliberately not offered here. Sign out is a row like
 * any other; the warning belongs on a confirmation, not on the thing an anon
 * passes every time they open this screen to do something else.
 */
type SettingsRowProps = {
    icon: ReactNode;
    label: string;
    /** Wayfinder route object, so the method travels with the destination. */
    href: ComponentProps<typeof Link>['href'];
    /**
     * `button` for a non-GET destination, matching Inertia's own behaviour.
     * `logout()` is a POST; a plain link would issue a GET and get a 405.
     */
    as?: 'button';
};

function SettingsRow({ icon, label, href, as }: SettingsRowProps) {
    return (
        <Link
            href={href}
            as={as}
            className="touch-target-44 flex w-full items-center gap-3 border-b border-border px-1 py-4 text-left text-body-sm text-foreground hover:bg-surface-hover"
        >
            <span className="shrink-0 text-muted-foreground">{icon}</span>
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <ChevronRightIcon
                aria-hidden="true"
                className="size-4 shrink-0 text-faint"
            />
        </Link>
    );
}

export { SettingsRow };
export type { SettingsRowProps };
