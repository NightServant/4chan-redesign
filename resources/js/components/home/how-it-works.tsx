import { MachineValue } from '@/components/clover/machine-value';
import { Section } from '@/components/home/section';

/**
 * Three, verbatim from the design. Deliberately not cards: a rule above each
 * column is what makes this band read differently from the card grids around
 * it.
 */
type Step = {
    title: string;
    body: string;
};

const STEPS: Step[] = [
    {
        title: 'Pick your boards',
        body: 'Subscribe to /g/, /wg/ or any of 74 boards. Your list syncs, nothing else does.',
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

function HowItWorks() {
    return (
        <Section
            id="how"
            label="How Clover works"
            title="Three steps, no onboarding tour"
        >
            <ol
                className="grid list-none gap-5"
                style={{
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                }}
            >
                {STEPS.map((step, index) => (
                    <li
                        key={step.title}
                        className="flex flex-col gap-2 border-t border-border-strong pt-4"
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
        </Section>
    );
}

export { HowItWorks };
