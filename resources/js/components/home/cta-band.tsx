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
            {/* One block of fixed width: the way into the feed alone on top
                and filled, the two account actions as an equal pair beneath
                it, both outlined so neither outranks the other. The pair
                spans exactly the primary's width, so the three read as one
                unit at every size. At 320 each half is about 129px, so the
                pair trims its side padding to keep "Create account" on one
                line. Signed in, only the way into the feed remains. */}
            <div className="mx-auto grid w-full max-w-xs grid-cols-2 gap-3 sm:max-w-sm">
                <Button size="lg" className="col-span-2 w-full" asChild>
                    <Link href={popular()}>Browse without an account</Link>
                </Button>
                {isSignedIn ? null : (
                    <>
                        <Button
                            size="lg"
                            variant="outline"
                            className="w-full px-3"
                            asChild
                        >
                            <Link href={register()}>Create account</Link>
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            className="w-full px-3"
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
