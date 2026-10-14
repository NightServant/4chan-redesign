import { Link, usePage } from '@inertiajs/react';
import { Check } from 'lucide-react';
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
type CtaBandProps = {
    /** Boards this visitor can read, counted server-side within their visibility. */
    boardCount: number;
};

/**
 * What each path gets you, so the choice above is an informed one. Every line
 * is something Clover does today: replies are signed Anonymous, threads can be
 * saved, boards followed, and reads are kept as history. Nothing here is a
 * promise of anything not built.
 */
function choices(boardCount: number) {
    return [
        {
            heading: 'With an account',
            items: [
                'Reply to any thread, still signed Anonymous',
                'Save threads to come back to',
                'Follow the boards you read most',
                'Pick up where you left off',
            ],
        },
        {
            heading: 'Without one',
            items: [
                `${boardCount.toLocaleString('en')} boards, read in full`,
                'Replies nested under the post they answer',
                'Refreshed from 4chan through the day',
            ],
        },
    ];
}

function CtaBand({ boardCount }: CtaBandProps) {
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

            {isSignedIn ? null : (
                <div className="mx-auto grid w-full max-w-2xl gap-x-10 gap-y-6 border-t border-border pt-8 text-left sm:grid-cols-2">
                    {choices(boardCount).map((choice) => (
                        <div
                            key={choice.heading}
                            className="flex flex-col gap-3"
                        >
                            <h3 className="text-body font-semibold text-foreground">
                                {choice.heading}
                            </h3>
                            <ul className="flex flex-col gap-2">
                                {choice.items.map((item) => (
                                    <li
                                        key={item}
                                        className="flex items-start gap-2.5 text-body leading-[1.5] text-muted-foreground"
                                    >
                                        <Check
                                            aria-hidden="true"
                                            className="mt-[3px] size-4 shrink-0 text-primary"
                                        />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
        </Section>
    );
}

export { CtaBand };
export type { CtaBandProps };
