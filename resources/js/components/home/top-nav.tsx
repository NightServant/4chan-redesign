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
                {/* `min-h-16` with `flex-wrap`, not a fixed `h-16` row.
                    At 320px this row needs 71 (wordmark) + 261 (auth
                    buttons) + 48 (theme toggle) = 380px, and a fixed
                    single-line height sent the button group 37px past the
                    edge of the viewport with nowhere for it to go. `min-h-16`
                    keeps the current height everywhere the content already
                    fits one line, and only grows to a second line where it
                    does not. */}
                <div
                    data-slot="top-nav-row"
                    className="mx-auto flex min-h-16 max-w-(--measure-page) flex-wrap items-center justify-between gap-2 border-x border-border px-6 py-2"
                >
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
                            /* Gone below `md`, unchanged from `md` up. Two
                               buttons of this length plus the wordmark and the
                               toggle need 380px on one line, so at 320 they
                               wrapped the header onto a second row to say the
                               same thing the hero already says.

                               The consequence is stated rather than solved:
                               the homepage has no drawer and no bottom bar, so
                               below `md` it now carries no route to sign in at
                               all — the hero's only call to action goes to
                               `/popular`. That is Gabe's call, made twice, and
                               a hamburger here is explicitly not the answer. */
                            <div
                                data-slot="top-nav-auth"
                                className="hidden items-center gap-2 md:flex"
                            >
                                <Button variant="ghost" asChild>
                                    <Link href={login()}>Log in</Link>
                                </Button>
                                <Button variant="primary" asChild>
                                    <Link href={register()}>
                                        Create account
                                    </Link>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </PatternField>
        </header>
    );
}

export { TopNav };
export type { TopNavProps };
