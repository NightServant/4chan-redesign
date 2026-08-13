import { Link } from '@inertiajs/react';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { login, register } from '@/routes';

/**
 * Shown at the top of the feed to a signed-out anon. Reading never needs an
 * account; posting and commenting do, so this is where that line
 * gets drawn rather than at the point of a blocked action.
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

            <div className="flex shrink-0 items-center gap-2">
                <Button variant="ghost" asChild>
                    <Link href={login()}>Log in</Link>
                </Button>
                <Button variant="primary" asChild>
                    <Link href={register()}>Create account</Link>
                </Button>
            </div>
        </Card>
    );
}

export { AnonBanner };
