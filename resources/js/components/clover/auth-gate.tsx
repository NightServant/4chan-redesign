import { Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import { login, register } from '@/routes';

type AuthGateProps = {
    /**
     * Verb phrase dropped into the body copy, e.g. `reply to this thread`,
     * `bless a thread`, `post a thread`.
     */
    action: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

/**
 * Shown whenever a signed-out anon reaches for something that needs an
 * account. Reading never triggers this; only replying, blessing, cursing or
 * starting a thread does.
 *
 * The copy is verbatim from the design prototype, with one deliberate
 * departure: the prototype uses an em dash before "the account", which the
 * taste laws ban outright. A comma reads the same sentence without it.
 */
function AuthGate({ action, open, onOpenChange }: AuthGateProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogTitle>Create an account to continue</DialogTitle>
                <DialogDescription>
                    Reading is open to everyone. You need an account to {action}
                    . Posts stay anonymous, the account is never attached to
                    them.
                </DialogDescription>

                {/**
                 * A third affordance, but as a quiet inline link rather than
                 * a third button: the two footer buttons are the decision
                 * ("keep browsing" or "create an account"), and a returning
                 * anon who already has an account is better served by a low-
                 * emphasis way past that decision than by a button competing
                 * with "Create account" for attention.
                 */}
                <p className="text-body-sm text-muted-foreground">
                    Already have an account?{' '}
                    <Link
                        href={login()}
                        className="text-foreground underline underline-offset-2 hover:no-underline"
                    >
                        Log in
                    </Link>
                </p>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Keep browsing
                    </Button>
                    <Button variant="primary" asChild>
                        <Link href={register()}>Create account</Link>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export { AuthGate };
export type { AuthGateProps };
