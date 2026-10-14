import { Link, usePage } from '@inertiajs/react';
import { Section } from '@/components/home/section';
import { Button } from '@/components/ui/button';
import { login, popular, register } from '@/routes';

/**
 * The page's last band: one sentence and one button.
 *
 * It is an ordinary band on the same paper as the rest, not a coloured slab.
 * Green is the accent, so the only green here is the button, which goes where
 * the hero's does: into the popular feed, with no account.
 */
function CtaBand() {
    const { auth } = usePage().props;
    const isSignedIn = Boolean(auth.user);

    return (
        <Section
            id="cta"
            depth={40}
            label="The next step"
            title="Start reading"
            description="Reading needs no account. Make one when you want to reply."
            align="center"
        >
            {/* Signed out: the account pair first, Log in then Create
                account, with Create account the one filled button; then an
                "or" and the way to read without one, full width and
                outlined. All three are 44px and share one block width, so
                they read as one unit. At 320 each half of the pair is about
                129px, hence its trimmed side padding. Signed in, the pair
                and the "or" go, and the way into the feed is the filled
                button. */}
            <div className="mx-auto grid w-full max-w-xs grid-cols-2 gap-3 sm:max-w-sm">
                {isSignedIn ? null : (
                    <>
                        <Button
                            size="lg"
                            variant="outline"
                            className="w-full px-3"
                            asChild
                        >
                            <Link href={login()}>Log in</Link>
                        </Button>
                        <Button size="lg" className="w-full px-3" asChild>
                            <Link href={register()}>Create account</Link>
                        </Button>
                        <p className="col-span-2 flex items-center gap-3 text-caption text-muted-foreground">
                            <span
                                aria-hidden="true"
                                className="h-px flex-1 bg-border"
                            />
                            or
                            <span
                                aria-hidden="true"
                                className="h-px flex-1 bg-border"
                            />
                        </p>
                    </>
                )}
                <Button
                    size="lg"
                    variant={isSignedIn ? 'primary' : 'outline'}
                    className="col-span-2 w-full"
                    asChild
                >
                    <Link href={popular()}>Browse without an account</Link>
                </Button>
            </div>
        </Section>
    );
}

export { CtaBand };
