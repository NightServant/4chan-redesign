import { Link, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { login, register } from '@/routes';

/**
 * What a signed-out anon gets at the foot of a phone, in place of the bottom
 * bar.
 *
 * The bar it replaces carried Home, Rules and Log in — two destinations the
 * drawer already lists and one control this says better. Gabe's decision,
 * 2026-08-18: below `md` a signed-out visitor sees a panel that cannot be
 * dismissed, saying what Clover is and offering the two ways in.
 *
 * It is fixed rather than a `Sheet`: a drawer that cannot be hidden is not a
 * drawer, it is furniture, and building it out of a dismissable primitive
 * would mean spending the rest of its life defending against being closed.
 *
 * Signed in, this does not render at all and `MobileNav` keeps its four
 * slots — an anon with an account needs navigation there, not an invitation
 * to make one.
 *
 * The sentence is the same claim the feed's own banner makes, in fewer words:
 * reading needs nothing, replying needs an account, and threads come from
 * 4chan. Nothing here promises a feature this application does not have.
 */
function AnonDock() {
    const { auth } = usePage().props;

    if (auth.user) {
        return null;
    }

    return (
        <div
            data-slot="anon-dock"
            className="fixed inset-x-0 bottom-0 z-[25] flex flex-col gap-3 border-t border-border bg-surface px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:hidden"
        >
            <p className="text-body-sm text-pretty text-muted-foreground">
                Clover reads 4chan. Anyone can browse; replying needs an
                account.
            </p>

            <div className="flex items-center gap-2">
                <Button variant="outline" asChild className="flex-1">
                    <Link href={login()}>Log in</Link>
                </Button>
                <Button variant="primary" asChild className="flex-1">
                    <Link href={register()}>Create account</Link>
                </Button>
            </div>
        </div>
    );
}

export { AnonDock };
