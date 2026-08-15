import { Link, usePage } from '@inertiajs/react';
import { MoonIcon, SunIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { PatternField } from '@/components/clover/pattern-field';
import { Wordmark } from '@/components/clover/wordmark';
import { Button } from '@/components/ui/button';
import { useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';
import { dashboard, home, login, register } from '@/routes';

/**
 * The homepage's sticky header.
 *
 * The design prototype's hamburger opens onto an empty `links` array, so
 * there is nothing behind it to build. Two auth buttons plus a wordmark
 * already fit down to 320px, so the whole nav stays visible at every width
 * instead of collapsing into a drawer with nothing in it.
 */
type TopNavProps = Omit<ComponentProps<'header'>, 'children'>;

function TopNav({ className, ...props }: TopNavProps) {
    const { auth } = usePage().props;
    const isSignedIn = Boolean(auth.user);
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const isDark = resolvedAppearance === 'dark';

    return (
        <header
            data-slot="top-nav"
            className={cn(
                'sticky top-0 z-20 border-b border-border',
                /* Opaque by default. The translucent fill is gated behind
                   `supports-[backdrop-filter]` because a see-through header
                   with no blur behind it is unreadable, not merely unstyled. */
                'bg-bg supports-[backdrop-filter]:bg-bg/75 supports-[backdrop-filter]:backdrop-blur-lg',
                className,
            )}
            {...props}
        >
            <PatternField depth={0} feather={false}>
                <div className="mx-auto flex h-16 max-w-(--measure-page) items-center justify-between border-x border-border px-6">
                    <Link href={home()} aria-label="Clover home">
                        <Wordmark />
                    </Link>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label={
                                isDark
                                    ? 'Switch to light theme'
                                    : 'Switch to dark theme'
                            }
                            onClick={() =>
                                updateAppearance(isDark ? 'light' : 'dark')
                            }
                        >
                            {isDark ? (
                                <SunIcon aria-hidden="true" />
                            ) : (
                                <MoonIcon aria-hidden="true" />
                            )}
                        </Button>

                        {isSignedIn ? (
                            <Button variant="primary" asChild>
                                <Link href={dashboard()}>Go to dashboard</Link>
                            </Button>
                        ) : (
                            <>
                                <Button variant="ghost" asChild>
                                    <Link href={login()}>Log in</Link>
                                </Button>
                                <Button variant="primary" asChild>
                                    <Link href={register()}>
                                        Create account
                                    </Link>
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </PatternField>
        </header>
    );
}

export { TopNav };
export type { TopNavProps };
