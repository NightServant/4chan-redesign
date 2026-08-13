import {
    LayoutGrid,
    MessageSquare,
    Share2,
    Shield,
    Users,
    Zap,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { Section } from '@/components/home/section';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * What Clover is, as six claims a reader steps through rather than six cards
 * they scan past.
 *
 * ## Why this stopped being a grid of cards
 *
 * Six cards of equal weight is a wall: every claim competes with the other
 * five, so the reader takes an impression rather than an argument, and the
 * body copy has to be short enough to fit a tile whether or not the claim
 * needs the room. As tabs, one claim is on screen at a time and can be
 * answered in a sentence that is allowed to breathe.
 *
 * It also drops six bordered boxes from a page whose own rule is that bands
 * are divided by hairlines rather than stacked as slabs.
 *
 * ## The composition
 *
 * Two columns. The left holds the claims and is the control; the right holds
 * the answer to whichever is selected. Vertical rather than the primitive's
 * default horizontal strip, because six labels of this length in a row either
 * wrap into an unreadable block or scroll sideways, and a list of claims reads
 * as a list of claims.
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
        body: 'Read any board without an account. Posting and commenting need one, and posts are still signed Anonymous.',
    },
    {
        icon: Zap,
        title: 'Fast on purpose',
        body: 'No infinite feed, no autoplay, no tracking scripts. Threads render in one request.',
    },
    {
        icon: Share2,
        title: 'Nothing to score',
        body: 'No votes, no karma, no reputation. A thread rises because anons replied to it, and you can send one to somebody without an account existing anywhere.',
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

/** Stable and readable in a URL fragment, rather than an index. */
function slugFor(title: string): string {
    return title.toLowerCase().replaceAll(' ', '-');
}

function Features() {
    return (
        <Section
            id="features"
            label="Features"
            title="Built for reading, not for engagement"
        >
            <Tabs
                defaultValue={slugFor(FEATURES[0].title)}
                orientation="vertical"
                /* Stacked on a phone, side by side from `md`. The list stays
                   above the answer either way, because the control has to come
                   before the thing it controls for anyone reading in order. */
                className="grid gap-6 md:grid-cols-[minmax(0,280px)_minmax(0,1fr)] md:gap-12"
            >
                {/* The primitive's list is a horizontal strip with a bottom
                    rule, so every part of that is overridden here: a column,
                    ruled down its left edge, with each claim marking itself
                    against that rule rather than under it. */}
                <TabsList className="w-full flex-col items-stretch gap-0 border-b-0 border-l border-border">
                    {FEATURES.map(({ title }) => (
                        <TabsTrigger
                            key={title}
                            value={slugFor(title)}
                            className="-mb-0 -ml-px justify-start border-b-0 border-l-2 px-4 py-3 text-left whitespace-normal data-[state=active]:border-l-primary data-[state=active]:font-semibold"
                        >
                            {title}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {FEATURES.map(({ icon: Icon, title, body }) => (
                    <TabsContent
                        key={title}
                        value={slugFor(title)}
                        className="flex flex-col gap-4 md:pt-1"
                    >
                        <Icon size={20} className="text-primary" />

                        <h3 className="font-display text-[clamp(22px,2.2vw,28px)] leading-[1.15] font-semibold tracking-[-0.4px] text-balance text-foreground">
                            {title}
                        </h3>

                        <p className="max-w-[52ch] text-[17px] leading-[1.55] text-pretty text-muted-foreground">
                            {body}
                        </p>
                    </TabsContent>
                ))}
            </Tabs>
        </Section>
    );
}

export { Features };
