import { Link, usePage } from '@inertiajs/react';
import { Check } from 'lucide-react';
import { Section } from '@/components/home/section';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
                "Keep a list of the threads you've read",
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
        >
            {/* The buttons, then what an account adds, then what reading
                without one gives. Ruled on the top and between, never the
                bottom; the grid bleeds through the section's padding
                (-mx-6, -mb-14) so its rules meet the band's edges, and the
                section's own side lines serve as its left and right.

                From `xl` the three sit in one row, the button column 486px:
                the description's 438px line with 24px either side, so the
                buttons start and end where that sentence does. Between `lg`
                and `xl` (small laptops) three columns left the lists 261px
                and wrapping on nearly every line, so the buttons take the
                first row and the two lists share the second. Below `lg`
                everything stacks. The button block is capped at 438px at
                every width, so it always lines up with the description.
                Each cell draws its own rules: shared `divide-*` utilities
                would double the section's left line on the second row.
                ponytail: 486/438px are measured from that one sentence at
                15px; re-measure if its copy changes. Signed in, only the
                button column remains, with Browse filled. */}
            <div
                className={cn(
                    '-mx-6 -mb-14 grid border-t border-border',
                    !isSignedIn &&
                        'lg:grid-cols-2 xl:grid-cols-[486px_minmax(0,1fr)_minmax(0,1fr)]',
                )}
            >
                <div className="p-6 lg:col-span-2 xl:col-span-1">
                    <div className="flex w-full max-w-[438px] flex-col gap-2">
                        {isSignedIn ? null : (
                            <>
                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        className="w-full px-3"
                                        asChild
                                    >
                                        <Link href={login()}>Log in</Link>
                                    </Button>
                                    <Button
                                        size="lg"
                                        className="w-full px-3"
                                        asChild
                                    >
                                        <Link href={register()}>
                                            Create account
                                        </Link>
                                    </Button>
                                </div>
                                <p className="flex items-center gap-3 text-caption leading-none text-muted-foreground">
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
                            className="w-full"
                            asChild
                        >
                            <Link href={popular()}>
                                Browse without an account
                            </Link>
                        </Button>
                    </div>
                </div>

                {isSignedIn
                    ? null
                    : choices(boardCount).map((choice, index) => (
                          <div
                              key={choice.heading}
                              className={cn(
                                  'flex flex-col gap-3 border-t border-border p-6',
                                  index === 0
                                      ? 'xl:border-t-0 xl:border-l'
                                      : 'lg:border-l xl:border-t-0',
                              )}
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
        </Section>
    );
}

export { CtaBand };
export type { CtaBandProps };
