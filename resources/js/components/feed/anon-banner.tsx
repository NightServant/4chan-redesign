import { Shield } from 'lucide-react';
import { Card } from '@/components/ui/card';

/**
 * Shown at the top of the feed to a signed-out anon. Reading never needs an
 * account; replying does, so this is where that line gets drawn rather than at
 * the point of a blocked action.
 *
 * It said "posting and commenting need an account", which promised something
 * Clover cannot do: a thread cannot be started here at all. Replies can, and
 * that is what the sentence says now.
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
                You are reading anonymously. Anyone can read; replying needs an
                account. Threads themselves come from 4chan, so new ones start
                there.
            </p>
        </Card>
    );
}

export { AnonBanner };
