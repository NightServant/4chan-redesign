import { Link, usePage } from '@inertiajs/react';
import { MoonIcon, SunIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { PatternField } from '@/components/clover/pattern-field';
import { Wordmark } from '@/components/clover/wordmark';
import { Button } from '@/components/ui/button';
import { useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';
import { dashboard, home } from '@/routes';

/**
 * The homepage's sticky header.
 *
 * The design prototype's hamburger opens onto an empty `links` array, so
 * there is nothing behind it to build. The bar holds the wordmark, the theme
 * toggle and, when signed in, the way back to the dashboard; Log in and
 * Create account sit in the closing call-to-action band instead.
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

                        {/* Signed out, the bar carries no account actions at any width:
                            Log in and Create account live in the closing
                            band, which every width reaches. That also ends the
                            old gap where a phone had no route to sign in from
                            the homepage at all. */}
                        {isSignedIn ? (
                            <Button variant="primary" asChild>
                                <Link href={dashboard()}>Go to dashboard</Link>
                            </Button>
                        ) : null}
                    </div>
                </div>
            </PatternField>
        </header>
    );
}

export { TopNav };
export type { TopNavProps };
