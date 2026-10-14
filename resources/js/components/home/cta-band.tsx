import { Link } from '@inertiajs/react';
import { Section } from '@/components/home/section';
import { Button } from '@/components/ui/button';
import { popular } from '@/routes';

/**
 * The page's last band: one sentence and one button.
 *
 * It is an ordinary band on the same paper as the rest, not a coloured slab.
 * Green is the accent, so the only green here is the button, which goes where
 * the hero's does: into the popular feed, with no account.
 */
function CtaBand() {
    return (
        <Section
            id="cta"
            depth={40}
            label="The next step"
            title="Start reading"
            description="Reading needs no account. Make one when you want to reply."
        >
            <div>
                <Button size="lg" asChild>
                    <Link href={popular()}>Browse without an account</Link>
                </Button>
            </div>
        </Section>
    );
}

export { CtaBand };
