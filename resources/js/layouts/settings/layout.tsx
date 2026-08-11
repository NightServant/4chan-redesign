import { Link } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { Palette, ShieldCheck, User } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { PageHeader } from '@/components/clover/page-header';
import { Separator } from '@/components/ui/separator';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { edit as editProfile } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';

/**
 * The shell every `settings/*` page renders inside. `app.tsx` stacks it under
 * `AppLayout`, so this file draws only the settings chrome: the page heading,
 * the section nav, and the column the page itself lands in.
 *
 * The h1 lives here rather than on each page. One heading for a screen whose
 * sections are all "Settings" is the honest outline, and it is the reason each
 * page underneath renders no heading of its own.
 */

type SettingsNavItem = {
    title: string;
    href: ReturnType<typeof editProfile>;
    icon: LucideIcon;
};

const settingsNavItems: SettingsNavItem[] = [
    { title: 'Profile', href: editProfile(), icon: User },
    { title: 'Security', href: editSecurity(), icon: ShieldCheck },
    { title: 'Appearance', href: editAppearance(), icon: Palette },
];

/**
 * Mirrors the app sidebar's rows so the two navs read as the same object at
 * different scales. `duration-[var(--duration-hover)]` rather than
 * `duration-hover`: Tailwind v4 has no `--duration-*` namespace, so the bare
 * class compiles to nothing.
 */
const rowBaseClasses =
    'flex h-9.5 items-center gap-3 rounded-lg px-3 text-body-sm transition-colors duration-[var(--duration-hover)] ease-standard';

const rowRestClasses =
    'text-muted-foreground hover:bg-surface-hover hover:text-foreground';

const rowActiveClasses = 'bg-primary-soft font-semibold text-primary';

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <div className="flex flex-col gap-8 px-4 py-6 lg:px-6">
            <PageHeader
                title="Settings"
                description="Your account, security and appearance."
            />

            <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
                <aside className="w-full lg:w-56 lg:shrink-0">
                    <nav
                        aria-label="Settings"
                        className="flex flex-col gap-0.5"
                    >
                        {settingsNavItems.map((item) => {
                            const active = isCurrentOrParentUrl(item.href);
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={toUrl(item.href)}
                                    href={item.href}
                                    aria-current={active ? 'page' : undefined}
                                    className={cn(
                                        rowBaseClasses,
                                        active
                                            ? rowActiveClasses
                                            : rowRestClasses,
                                    )}
                                >
                                    <Icon
                                        aria-hidden="true"
                                        className="size-4 shrink-0"
                                    />
                                    <span className="truncate">
                                        {item.title}
                                    </span>
                                </Link>
                            );
                        })}
                    </nav>
                </aside>

                {/* Below `lg` the nav sits above the content rather than
                    beside it, so the two need a visible boundary. */}
                <Separator className="lg:hidden" />

                <div className="flex min-w-0 flex-1 flex-col gap-6 lg:max-w-2xl">
                    {children}
                </div>
            </div>
        </div>
    );
}
