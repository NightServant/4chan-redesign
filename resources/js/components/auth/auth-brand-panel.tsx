import { Link } from '@inertiajs/react';
import { Bookmark, History, Shield } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { Mark, Wordmark } from '@/components/clover/wordmark';
import { FOOTER_LINKS } from '@/lib/navigation';
import { cn } from '@/lib/utils';

/**
 * The left half of the auth screen: what an account is for, and what it is
 * not for. It is hidden below `lg`, so nothing here may be load-bearing.
 *
 * That constraint is why the headline is a paragraph rather than the `h1` the
 * design uses. The card's title is the heading that names the page, and it is
 * present at every width; promoting this to `h1` would either give the page
 * two of them or make the document's only `h1` disappear on a phone.
 */
type AuthBrandPanelProps = Omit<ComponentProps<'div'>, 'children'>;

const HEADLINE =
    'The same boards, threads and greentext. Without the 2003 interface.';

/**
 * The design's original wrote this with an em dash before "nothing". Clover's
 * copy rules forbid literal em dashes, so it is a comma.
 */
const INTRO =
    'An account only carries your boards, your bookmarks and your janitor scope between devices. Posts stay anonymous, nothing you post is ever attached to it.';

const GUARANTEES: readonly {
    icon: LucideIcon;
    title: string;
    body: string;
}[] = [
    {
        icon: Shield,
        title: 'Anonymous by default',
        body: 'Every post is signed >Anonymous unless you attach a tripcode yourself.',
    },
    {
        icon: Bookmark,
        title: 'Your boards travel with you',
        body: 'Subscriptions, saved threads and read state sync across sessions.',
    },
    {
        icon: History,
        title: "Nothing kept you don't ask for",
        body: 'No feed history, no ad profile, no third-party trackers.',
    },
];

/**
 * The same 64px hairline weave the homepage hero uses. It is repeated rather
 * than imported because the hero keeps its copy private, and duplicating four
 * lines is cheaper than exporting a styling detail across two features.
 */
const GRID_BACKGROUND = {
    backgroundImage: [
        'repeating-linear-gradient(to right, var(--color-border) 0, var(--color-border) 1px, transparent 1px, transparent 64px)',
        'repeating-linear-gradient(to bottom, var(--color-border) 0, var(--color-border) 1px, transparent 1px, transparent 64px)',
    ].join(', '),
};

function AuthBrandPanel({ className, ...props }: AuthBrandPanelProps) {
    return (
        <div
            data-slot="auth-brand-panel"
            className={cn(
                'relative flex-col justify-between gap-12 overflow-hidden border-r border-border px-14 py-12',
                className,
            )}
            {...props}
        >
            <div
                data-slot="auth-brand-decoration"
                aria-hidden="true"
                className="absolute inset-0 opacity-50"
                style={GRID_BACKGROUND}
            />

            {/* Wallpaper, bleeding off two edges. `decorative` takes it out
                of the accessibility tree rather than giving it an empty name. */}
            <Mark
                data-slot="auth-brand-decoration"
                decorative
                size={520}
                className="pointer-events-none absolute -right-28 -bottom-36 opacity-[0.045]"
            />

            <div className="relative">
                <Wordmark />
            </div>

            <div className="relative flex max-w-[480px] flex-col gap-8">
                <p className="font-display text-display font-bold text-balance text-foreground">
                    {HEADLINE}
                </p>

                <p className="text-body text-pretty text-muted-foreground">
                    {INTRO}
                </p>

                <ul className="flex flex-col gap-5">
                    {GUARANTEES.map(({ icon: Icon, title, body }) => (
                        <li key={title} className="flex gap-3">
                            <span
                                aria-hidden="true"
                                className="mt-px flex size-8 shrink-0 items-center justify-center"
                            >
                                <Icon size={15} className="text-primary" />
                            </span>

                            <span className="flex flex-col gap-1">
                                <span className="text-body-sm font-semibold text-foreground">
                                    {title}
                                </span>
                                <span className="text-meta text-faint">
                                    {body}
                                </span>
                            </span>
                        </li>
                    ))}
                </ul>
            </div>

            <nav
                aria-label="Site information"
                className="relative flex flex-wrap gap-x-6 gap-y-2 text-caption text-faint"
            >
                {FOOTER_LINKS.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className="transition-colors duration-[var(--duration-hover)] ease-standard hover:text-foreground"
                    >
                        {link.title}
                    </Link>
                ))}
            </nav>
        </div>
    );
}

export { AuthBrandPanel };
export type { AuthBrandPanelProps };
