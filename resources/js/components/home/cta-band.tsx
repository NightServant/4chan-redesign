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
            {/* One primary, one secondary, one tertiary, all the same 44px
                size, so the eye lands on reading first and the two account
                actions read as the quieter options they are. Stacked at full
                width on a phone, in the same order; one centred row from
                `sm` up. Signed in, only the way into the feed remains. */}
            <div className="mx-auto flex w-full max-w-xs flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:justify-center">
                <Button size="lg" className="w-full sm:w-auto" asChild>
                    <Link href={popular()}>Browse without an account</Link>
                </Button>
                {isSignedIn ? null : (
                    <>
                        <Button
                            size="lg"
                            variant="outline"
                            className="w-full sm:w-auto"
                            asChild
                        >
                            <Link href={register()}>Create account</Link>
                        </Button>
                        <Button
                            size="lg"
                            variant="ghost"
                            className="w-full sm:w-auto"
                            asChild
                        >
                            <Link href={login()}>Log in</Link>
                        </Button>
                    </>
                )}
            </div>
        </Section>
    );
}

export { CtaBand };
