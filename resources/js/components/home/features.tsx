import {
    LayoutGrid,
    MessageSquare,
    Share2,
    Shield,
    Users,
    Zap,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
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
 * Two equal columns. The left holds the claims and is the control; the right
 * holds the answer to whichever is selected. Vertical rather than the
 * primitive's default horizontal strip, because six labels of this length in a
 * row either wrap into an unreadable block or scroll sideways, and a list of
 * claims reads as a list of claims.
 *
 * Equal halves rather than a narrow rail beside a wide panel. The claims are
 * not a table of contents for the answers, they are half the argument: a
 * reader who only scans the left column has still read the case for the site.
 * Sizing them the same says so.
 *
 * A rule divides the two, not a gap. Whitespace between columns reads as two
 * lists that happen to sit side by side, and this pair is one control and its
 * output. The rule is the list's own right edge, so a single line falls
 * between the columns rather than two meeting in the gutter.
 *
 * ## Motion
 *
 * Switching claims is the one moment this band has, so the answer is animated
 * rather than swapped. The outgoing answer leaves before the incoming one
 * arrives, which reads as a card being turned over rather than as text being
 * replaced; the marker on the selected claim slides between rows on a shared
 * layout id, so the eye is carried from the old row to the new one instead of
 * having to find it again.
 *
 * All of it is position and opacity on content already on the page, and all of
 * it resolves. Nothing here paints a surface.
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
    const reduced = useReducedMotion();
    const [selected, setSelected] = useState(slugFor(FEATURES[0].title));

    return (
        <Section
            id="features"
            depth={40}
            label="Features"
            title="Built for reading, not for engagement"
        >
            <Tabs
                value={selected}
                onValueChange={setSelected}
                orientation="vertical"
                /* Stacked on a phone, equal halves from `md`. The list stays
                   above the answer either way, because the control has to come
                   before the thing it controls for anyone reading in order. */
                className="grid gap-6 md:grid-cols-2 md:gap-0"
            >
                {/* The primitive's list is a horizontal strip with a bottom
                    rule, so every part of that is overridden here: a column,
                    ruled down its left edge, with each claim marking itself
                    against that rule rather than under it. */}
                {/* The divider between the claims and their answer. A rule
                    rather than a gap: two columns separated by whitespace read
                    as two lists that happen to be adjacent, and this pair is
                    one control and its output. It is the list's right edge so
                    that a single line falls between the columns rather than
                    two lines meeting in the gutter. */}
                <TabsList className="w-full flex-col items-stretch gap-0 border-b-0 border-l border-border md:border-r md:pr-0">
                    {FEATURES.map(({ title }) => (
                        <TabsTrigger
                            key={title}
                            value={slugFor(title)}
                            /* The border is transparent even when active: the
                               marker below paints it, so the two cannot both
                               claim the same edge and double it. */
                            className="relative -mb-0 -ml-px justify-start border-b-0 border-l-2 border-l-transparent px-4 py-3 text-left whitespace-normal data-[state=active]:border-l-transparent data-[state=active]:font-semibold"
                        >
                            {selected === slugFor(title) ? (
                                <motion.span
                                    layoutId="feature-marker"
                                    aria-hidden="true"
                                    transition={
                                        reduced
                                            ? { duration: 0 }
                                            : {
                                                  type: 'spring',
                                                  stiffness: 480,
                                                  damping: 40,
                                              }
                                    }
                                    className="absolute inset-y-0 -left-0.5 w-0.5 bg-primary"
                                />
                            ) : null}
                            {title}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {/* `mode="wait"` so the two answers never overlap. Crossfading
                    them stacks two paragraphs of body copy on top of each
                    other for the length of the transition, which is unreadable
                    for exactly as long as it lasts. */}
                <AnimatePresence mode="wait" initial={false}>
                    {FEATURES.filter(
                        ({ title }) => slugFor(title) === selected,
                    ).map(({ icon: Icon, title, body }) => (
                        <TabsContent
                            key={title}
                            value={slugFor(title)}
                            forceMount
                            className="flex flex-col gap-4 md:pt-1 md:pl-12"
                            asChild
                        >
                            <motion.div
                                initial={
                                    reduced ? false : { opacity: 0, y: 10 }
                                }
                                animate={{ opacity: 1, y: 0 }}
                                exit={
                                    reduced
                                        ? { opacity: 1 }
                                        : { opacity: 0, y: -6 }
                                }
                                transition={{
                                    duration: 0.22,
                                    ease: [0.2, 0, 0, 1],
                                }}
                            >
                                <Icon size={20} className="text-primary" />

                                <h3 className="font-display text-[clamp(22px,2.2vw,28px)] leading-[1.15] font-semibold tracking-[-0.4px] text-balance text-foreground">
                                    {title}
                                </h3>

                                <p className="max-w-[52ch] text-[17px] leading-[1.55] text-pretty text-muted-foreground">
                                    {body}
                                </p>
                            </motion.div>
                        </TabsContent>
                    ))}
                </AnimatePresence>
            </Tabs>
        </Section>
    );
}

export { Features };
