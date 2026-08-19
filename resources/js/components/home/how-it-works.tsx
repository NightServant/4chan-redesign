import { MachineValue } from '@/components/clover/machine-value';
import { Section } from '@/components/home/section';

/**
 * Three, verbatim from the design. Deliberately not cards: the lines are the
 * grid's own, so each step sits in a cell of a hard grid rather than in a box
 * of its own.
 */
type Step = {
    title: string;
    body: string;
};

type HowItWorksProps = {
    /**
     * Boards this visitor can reach, counted by the server.
     *
     * The first step used to say "any of 74 boards", typed in by hand. There
     * are 77, of which 53 are worksafe, so the figure was wrong whether you
     * read it as the whole directory or as what a signed-out visitor is
     * shown. A number in marketing copy that nothing recomputes is a claim
     * with an expiry date on it.
     */
    boardCount: number;
};

function steps(boardCount: number): Step[] {
    return [
        {
            title: 'Pick your boards',
            body: `Subscribe to /g/, /wg/ or any of ${boardCount} boards. Your list syncs, nothing else does.`,
        },
        {
            title: 'Read now, account later',
            body: 'Browsing is open to everyone. Create an account when you want to post or comment.',
        },
        {
            title: 'Bump what deserves it',
            body: 'Replies bump a thread back to the top. There is nothing to upvote and no score to farm.',
        },
    ];
}

function HowItWorks({ boardCount }: HowItWorksProps) {
    const stepList = steps(boardCount);

    return (
        <Section
            id="how"
            depth={60}
            label="How Clover works"
            title="Three steps, no onboarding tour"
        >
            {/* A hard grid, ruled on both axes, flush with the band's frame
                and in the same `border-border` hairline the features and
                trending bands use. It ruled each step with a `border-t` above
                it in `border-border-strong` — a heavier line than anything else
                on the page draws — and then set the steps `gap-5` apart, so
                those lines floated rather than meeting. Cells in a ruled grid
                share their edges; the breathing room is `p-6` inside them.

                Which line is drawn by what: `Section` draws the vertical rules
                down both sides of the content column, so the grid draws none of
                its own. `-ml-6` cancels the column's left padding to start the
                grid on that frame, and `-mr-[25px]` is the same 24px plus one
                more, so the last cell's right-hand rule falls exactly on the
                section's rather than beside it.

                The frame below carries the bottom rule, and the grid is pulled
                a pixel into it so the last row's own bottom rule lands on that
                same line. That is this band's short-row closure: its column
                count is an `auto-fit` track rather than a pair of breakpoints,
                so nothing here can count the columns and pad a short last row
                the way the trending list does — and with three steps a short
                row is exactly what happens at two columns. */}
            <div
                data-slot="how-it-works-frame"
                className="-mr-[25px] -ml-6 border-b border-border"
            >
                <ol
                    className="-mb-px grid list-none border-t border-border"
                    style={{
                        /* `min(260px, 100%)`, not a bare 260px minimum — see
                           board-directory.tsx for the overflow a bare pixel
                           minimum produces at a 320px viewport. */
                        gridTemplateColumns:
                            'repeat(auto-fit, minmax(min(260px, 100%), 1fr))',
                    }}
                >
                    {stepList.map((step, index) => (
                        <li
                            key={step.title}
                            className="flex flex-col gap-2 border-r border-b border-border p-6"
                        >
                            <MachineValue>
                                {String(index + 1).padStart(2, '0')}
                            </MachineValue>
                            <h3 className="font-display text-h3 font-semibold">
                                {step.title}
                            </h3>
                            <p className="text-body-sm text-muted-foreground">
                                {step.body}
                            </p>
                        </li>
                    ))}
                </ol>
            </div>
        </Section>
    );
}

export { HowItWorks };
export type { HowItWorksProps };
