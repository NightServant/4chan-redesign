import { Shield } from 'lucide-react';
import { Card } from '@/components/ui/card';

/**
 * Shown at the top of the feed to a signed-out anon. Reading never needs an
 * account; posting and commenting do, so this is where that line gets drawn
 * rather than at the point of a blocked action.
 *
 * It carried "Log in" and "Create account" buttons, and the header carries
 * both on every screen a signed-out anon can reach — including this one, two
 * inches above. A banner that repeats the chrome directly beneath it is not
 * offering a second chance to sign up, it is asking the same question twice.
 *
 * What is left is the sentence, which is the part the header does not say.
 */
function AnonBanner() {
    return (
        <Card className="flex-row items-center gap-4 px-5 py-5">
            <span
                aria-hidden="true"
                className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-surface-elevated text-faint"
            >
                <Shield aria-hidden="true" className="size-5" />
            </span>

            <p className="flex-1 text-body-sm text-pretty text-muted-foreground">
                You are browsing anonymously. Reading is open to everyone,
                posting and commenting need an account.
            </p>
        </Card>
    );
}

export { AnonBanner };
