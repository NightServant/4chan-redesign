import {
    ChevronDown,
    LayoutGrid,
    MessageSquare,
    Share2,
    Shield,
    Users,
    Zap,
} from 'lucide-react';
import { useState } from 'react';
import type { ComponentType } from 'react';
import { Section } from '@/components/home/section';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useIsMobile } from '@/hooks/use-mobile';

/**
 * What Clover is, as six claims a reader opens one at a time.
 *
 * ## Why this stopped being a grid of cards, and then stopped being tabs
 *
 * Six cards of equal weight is a wall: every claim competes with the other
 * five, so the reader takes an impression rather than an argument, and the
 * body copy has to be short enough to fit a tile whether or not the claim
 * needs the room. Tabs fixed that and brought their own problem, which is two
 * equal columns: below `md` the list and its answer stack, and a reader has to
 * look away from the claim they pressed to find what it says.
 *
 * ## An accordion below `md`, the whole list above it
 *
 * Gabe's request, 2026-08-17, and the breakpoint is the request. On a phone a
 * band of six claims and six paragraphs is a screen and a half of scrolling
 * before anything else on the page, so the answers collapse under the claims
 * they belong to. There is room for all six on a desktop, so all six are
 * simply shown: headings and descriptions, and nothing to press.
 *
 * It branches on `useIsMobile` rather than on a class, and that is the
 * load-bearing part. A CSS-gated accordion would keep the triggers in the
 * document at every width, so at `md` and up there would be six buttons
 * announcing "collapsed" over content that is permanently visible — controls
 * claiming to do something they do not. Above `md` there are no buttons at
 * all. The same reasoning picks a sheet over a dialog in
 * `account/edit-profile-dialog.tsx`.
 *
 * ## Real headings, not styled `div`s
 *
 * Each trigger is a `button` inside an `h3`. That is the load-bearing detail:
 * an accordion whose triggers are `div`s is a list a screen reader cannot
 * navigate, because none of it appears in the document outline and there is
 * nothing to jump between. Wrapped this way the band reads as six named
 * subsections of "Built for reading, not for engagement", and each one
 * announces whether it is open.
 *
 * The icon is inside the trigger rather than beside it, so pressing the glyph
 * is pressing the control. A decorative icon next to a button is a target that
 * looks pressable and is not.
 *
 * ## One open at a time
 *
 * The claim being answered is a single piece of state, and the rows are
 * `Collapsible`s driven by it. Radix still owns every part of a disclosure
 * that is easy to get wrong: `aria-expanded`, `aria-controls`, the id joining
 * them, the keyboard handling and the `data-state` the height animation hangs
 * off. What is written here is only which of the six that state names.
 *
 * The open one closes when pressed again. A disclosure that cannot be closed
 * is a label with extra steps.
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
        body: 'Read any board without an account. Replying needs one, and every reply is still signed Anonymous.',
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
        /* This said "Janitors, not bots": every report read by a human, with a
           scoped board list and a public action log. There is no report
           button, no janitor role and no log — three claims about machinery
           that has never existed. What replaced it is the thing that is
           actually true and actually unusual. */
        title: 'Nothing goes back',
        body: 'Clover only ever reads from 4chan. Nothing you write here is sent there, because the API it reads accepts no writes at all.',
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

/** One claim, opened and closed. Below `md` only: see the docblock above. */
function FeatureDisclosure({
    feature: { icon: Icon, title, body },
    open,
    onOpenChange,
}: {
    feature: Feature;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <Collapsible
            open={open}
            onOpenChange={onOpenChange}
            className="border-r border-b border-border px-6"
        >
            {/* A real heading with the button inside it. An accordion whose
                triggers are `div`s is a list a screen reader cannot navigate:
                none of it reaches the document outline, so there is nothing to
                jump between and no announcement of what is open. */}
            <h3>
                <CollapsibleTrigger className="group flex w-full items-center gap-3 py-5 text-left transition-colors duration-[var(--duration-hover)] ease-standard hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                    {/* Inside the control, not beside it. A decorative glyph
                        next to a button is a target that looks pressable and
                        is not, and the request was that the icon works too. */}
                    <Icon
                        size={20}
                        aria-hidden="true"
                        className="shrink-0 text-primary"
                    />

                    <span className="min-w-0 flex-1 font-display text-h2 font-semibold tracking-[-0.2px] text-pretty text-foreground">
                        {title}
                    </span>

                    <ChevronDown
                        size={18}
                        aria-hidden="true"
                        className="shrink-0 text-faint transition-transform duration-[var(--duration-hover)] ease-standard group-data-[state=open]:rotate-180 motion-reduce:transition-none"
                    />
                </CollapsibleTrigger>
            </h3>

            <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down motion-reduce:animate-none">
                <p className="max-w-[52ch] pb-5 pl-8 text-body leading-[1.55] text-pretty text-muted-foreground">
                    {body}
                </p>
            </CollapsibleContent>
        </Collapsible>
    );
}

/** The same claim with nothing to press. `md` and up. */
function FeatureEntry({
    feature: { icon: Icon, title, body },
}: {
    feature: Feature;
}) {
    return (
        <div className="flex h-full flex-col gap-2 border-r border-b border-border p-6">
            <h3 className="flex items-center gap-3 font-display text-h2 font-semibold tracking-[-0.2px] text-pretty text-foreground">
                <Icon
                    size={20}
                    aria-hidden="true"
                    className="shrink-0 text-primary"
                />
                {title}
            </h3>

            <p className="max-w-[52ch] pl-8 text-body leading-[1.55] text-pretty text-muted-foreground">
                {body}
            </p>
        </div>
    );
}

function Features() {
    const isMobile = useIsMobile();

    /**
     * Which claim is answered. One at a time: six open bodies is the wall of
     * copy this band stopped being, and the open one closes when pressed
     * again, because a disclosure that cannot close is a label.
     *
     * Radix still owns everything that is easy to get wrong about a
     * disclosure: `aria-expanded`, `aria-controls`, the id joining them, the
     * keyboard handling and the `data-state` the height animation hangs off.
     * What is written here is only which of the six that state names.
     */
    const [open, setOpen] = useState<string | null>(slugFor(FEATURES[0].title));

    return (
        <Section
            id="features"
            depth={40}
            label="Features"
            title="Built for reading, not for engagement"
        >
            {/* A hard grid, ruled on both axes, flush with the band's frame.

                One column below `md`, two at `md`, three at `lg`. One column
                at every width left about a thousand pixels of empty paper
                beside six short items at 1420px while the band ran nearly
                800px tall.

                ## Which line is drawn by what

                `Section` draws the vertical rules down both sides of the
                content column (`border-x`) and the horizontal rule above the
                band (`border-t` on the section). The grid draws its own top
                rule, every interior line, and the bottom of its last row —
                nothing else. So:

                - **left and right edges: the section's.** The grid adds none.
                  Two hairlines a pixel apart is what happens if it does.
                - **interior verticals and horizontals: the cells',** one each,
                  drawn by `border-r border-b`. That pattern survives a wrapping
                  grid without any `:nth-child` scheme, which matters because
                  the column count changes at two breakpoints and a rule keyed
                  to three columns is wrong at two.

                The last cell in each row still draws a right-hand rule, and it
                would land beside the section's rather than on it. `-ml-6`
                cancels the column's left padding so the grid starts on the
                frame; `-mr-[25px]` is that same 24px plus one more, so the
                grid runs a pixel *past* the frame and the last cell's rule
                falls exactly on the section's. Same line, by construction
                rather than by exception — `[&>*:last-child]:border-r-0` cannot
                do this, since "last in row" is not a thing CSS can name here.

                The breathing room the `px-6` used to give is now `p-6` inside
                each cell, so the text is not against the rules.

                No short last row to worry about: `FEATURES` is six, and six
                divides by one, two and three alike. */}
            <div
                data-slot="features-list"
                className="-mr-[25px] -ml-6 grid border-t border-border md:grid-cols-2 lg:grid-cols-3"
            >
                {FEATURES.map((feature) =>
                    isMobile ? (
                        <FeatureDisclosure
                            key={feature.title}
                            feature={feature}
                            open={open === slugFor(feature.title)}
                            onOpenChange={(next) =>
                                setOpen(next ? slugFor(feature.title) : null)
                            }
                        />
                    ) : (
                        <FeatureEntry key={feature.title} feature={feature} />
                    ),
                )}
            </div>
        </Section>
    );
}

export { Features };
