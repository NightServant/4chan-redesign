import {
    ArrowBigUp,
    LayoutGrid,
    MessageSquare,
    Shield,
    Users,
    Zap,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { Section } from '@/components/home/section';
import { Card } from '@/components/ui/card';

/**
 * Six, verbatim from the design. This is the product's voice: dry and
 * specific, not a pitch. Do not paraphrase.
 */
type Feature = {
    icon: ComponentType<{ size?: number; className?: string }>;
    title: string;
    body: string;
};

const FEATURES: Feature[] = [
    {
        icon: Shield,
        title: 'Anonymous by default',
        body: 'Read any board without an account. Posting, commenting and blessing need one, and posts are still signed Anonymous.',
    },
    {
        icon: Zap,
        title: 'Fast on purpose',
        body: 'No infinite feed, no autoplay, no tracking scripts. Threads render in one request.',
    },
    {
        icon: ArrowBigUp,
        title: 'Blessings and curses',
        body: 'Ranking is bump order plus blessings. No algorithmic timeline deciding what you read.',
    },
    {
        icon: Users,
        title: 'Janitors, not bots',
        body: 'Every report is read by a human janitor with a scoped board list and a public action log.',
    },
    {
        icon: MessageSquare,
        title: 'Greentext preserved',
        body: 'Markdown, quotes and >greentext work the way they always have.',
    },
    {
        icon: LayoutGrid,
        title: 'Boards, not follows',
        body: 'You subscribe to subjects. Nobody accumulates an audience.',
    },
];

function Features() {
    return (
        <Section
            id="features"
            label="Features"
            title="Built for reading, not for engagement"
        >
            <div
                className="grid gap-3.5"
                style={{
                    gridTemplateColumns:
                        'repeat(auto-fill, minmax(300px, 1fr))',
                }}
            >
                {FEATURES.map(({ icon: Icon, title, body }) => (
                    <Card key={title} hoverLift className="gap-3 p-5">
                        <div className="flex size-[34px] items-center justify-center rounded-[10px] border border-primary-line bg-primary-soft">
                            <Icon size={16} className="text-primary" />
                        </div>
                        <h3 className="font-display text-h3 font-semibold">
                            {title}
                        </h3>
                        <p className="text-body-sm text-pretty text-muted-foreground">
                            {body}
                        </p>
                    </Card>
                ))}
            </div>
        </Section>
    );
}

export { Features };
