import { Section } from '@/components/home/section';

/**
 * Three plain statements about how 4chan's own interface reads. They are
 * paragraphs, not a feature grid: no icons, no bolded lead-ins, no numbers.
 * The next band answers them, so this one only has to state the problem.
 *
 * The wording is deliberately limited to what anyone can see on 4chan's
 * default pages, with no counts or comparisons that would need a source.
 */
const POINTS = [
    'A thread is one flat column. Who answered whom lives in >>numbers you follow by hand.',
    'Reading happens one board at a time, from a paged index or a grid of thumbnails.',
    'The default skins are the original beige and blue, and every board uses the same dense layout.',
] as const;

function Problem() {
    return (
        <Section
            id="problem"
            depth={50}
            label="The problem"
            title="Good boards, an old way to read them"
        >
            {/* The same ruled grid the features band draws, so the frame
                reads as one continuous drawing: the section owns the outer
                edges, the cells own every interior line. See `Features` for
                why the margins are pulled by 24px and 25px. */}
            <div
                data-slot="problem-points"
                className="-mr-[25px] -ml-6 grid border-t border-border md:grid-cols-3"
            >
                {POINTS.map((point) => (
                    <p
                        key={point}
                        className="border-r border-b border-border p-6 text-body leading-[1.55] text-pretty text-muted-foreground"
                    >
                        {point}
                    </p>
                ))}
            </div>
        </Section>
    );
}

export { Problem };
