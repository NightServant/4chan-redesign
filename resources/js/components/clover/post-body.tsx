import { MachineValue } from '@/components/clover/machine-value';
import { cn } from '@/lib/utils';

/**
 * The text of a post, with greentext and `>>` references rendered.
 *
 * Both were promised and neither worked. Bodies were drawn as `{post.body}`
 * inside a single `<p>`, which was fine for one-line fixtures and is not fine
 * for real 4chan posts: they are multi-line, they lean on greentext to carry
 * tone, and rendered as one paragraph they collapse into a run-on with the
 * quoting silently erased.
 *
 * **This component never receives markup.** 4chan's `com` field is HTML
 * written by anonymous strangers, and it is parsed into plain text on the way
 * into the database by `App\Services\FourChan\CommentParser`. That is what
 * makes rendering it as text correct rather than merely cautious, and it is
 * why there is no `dangerouslySetInnerHTML` here. A body arriving with
 * `<script>` in it is a body containing those eight characters, and that is
 * what an anon sees.
 */

/** A line of greentext, e.g. `>be me`. Two chevrons is a post reference. */
function isGreentext(line: string): boolean {
    return line.startsWith('>') && !line.startsWith('>>');
}

/** A whole line that is nothing but a `>>109522303` reference. */
const REFERENCE_LINE = /^>>(\d+)$/;

type PostBodyProps = {
    /** Plain text with `\n` breaks. Never HTML. */
    body: string;
    className?: string;
};

/**
 * Runs of blank lines collapse to one.
 *
 * Blank lines are meaningful spacing in an imageboard post, so they are not
 * dropped outright. But a post padded with forty of them — which the corpus
 * genuinely contains — would otherwise push its own footer off the screen and
 * blow a fixed-height card apart.
 */
function normalise(body: string): string[] {
    const lines = body.split('\n').map((line) => line.trimEnd());

    return lines.filter(
        (line, index) => line !== '' || (lines[index - 1] ?? '') !== '',
    );
}

function PostBody({ body, className }: PostBodyProps) {
    const lines = normalise(body);

    if (lines.length === 0) {
        return null;
    }

    return (
        <div
            data-slot="post-body"
            className={cn(
                'flex max-w-prose flex-col text-body-sm text-foreground',

                /* Post bodies are full of bare URLs long enough to force a card
                   wider than its column. Breaking inside a word is ugly and is
                   still better than a horizontal scrollbar on every thread. */
                'break-words whitespace-pre-wrap',

                className,
            )}
        >
            {lines.map((line, index) => {
                if (line === '') {
                    return <span key={index} aria-hidden="true">&nbsp;</span>;
                }

                const reference = REFERENCE_LINE.exec(line);

                if (reference) {
                    return (
                        <MachineValue key={index} className="text-accent-text">
                            {line}
                        </MachineValue>
                    );
                }

                if (isGreentext(line)) {
                    return (
                        <span key={index} className="text-primary italic">
                            {line}
                        </span>
                    );
                }

                return <span key={index}>{line}</span>;
            })}
        </div>
    );
}

export { PostBody };
export type { PostBodyProps };
