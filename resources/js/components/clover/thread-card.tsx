import { Link } from '@inertiajs/react';
import { Bookmark, ImageIcon, MessageSquare } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { BoardAvatar } from '@/components/clover/board-avatar';
import { MachineValue } from '@/components/clover/machine-value';
import { PostAttachment } from '@/components/clover/post-image';
import { ShareControl } from '@/components/clover/share-control';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Thread } from '@/types/clover';

/**
 * One thread as it appears in a feed.
 *
 * ## Not a card any more
 *
 * It was a bordered, rounded, lifting `Card`. A feed of thirty of those is
 * thirty boxes, and the box is the loudest thing on each of them: the border
 * competes with the thread's own attachment, the padding pushes the next
 * thread off the screen, and the lift on hover animates furniture rather than
 * content. Rows on a hairline are denser, quieter, and match the ruled
 * register the rest of the site moved to.
 *
 * The excerpt went with it. It was the first 240 characters of the opening
 * post, printed under a title that is very often the first line of that same
 * post, so the card frequently said the same thing twice at two sizes. What a
 * reader needs from a row is which board, what it is called, and how busy it
 * is.
 *
 * The card reads as clickable everywhere, but the accessible target is the
 * title link alone. Nesting the share and bookmark buttons inside that link
 * would be invalid HTML and would break their focus and keyboard behaviour,
 * so they stay siblings of it instead: the link stretches over the whole
 * card with a positioned pseudo-element (the "stretched link" pattern), and
 * the footer row is given `position: relative` so it paints above that
 * stretch and keeps its own buttons independently clickable and focusable.
 */
type ThreadCardProps = Omit<ComponentProps<'div'>, 'onClick' | 'children'> & {
    thread: Thread;
    /**
     * Overrides where the title links. Thread routes do not exist yet, so
     * surfaces that show a card before then point it somewhere real rather
     * than at a 404.
     */
    href?: string;
    onBookmark?: () => void;
    /**
     * Something the surrounding screen knows and the thread does not.
     *
     * The history screen is the caller this exists for: it shows the same
     * threads the feed does and one thing the feed has no opinion about --
     * when this anon was last on them. It renders beside the board line, so a
     * row still reads as the same object it is everywhere else.
     */
    meta?: ReactNode;
};

const iconButtonClasses = cn(
    'inline-flex size-8.5 shrink-0 items-center justify-center rounded-md text-muted-foreground',
    'transition-colors duration-[var(--duration-hover)] ease-standard hover:bg-surface-hover',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
);

function ThreadCard({
    thread,
    href,
    onBookmark,
    meta,
    className,
    ...props
}: ThreadCardProps) {
    const titleHref = href ?? `${thread.board}${thread.no}`;

    return (
        <div
            data-slot="thread-card"
            className={cn(
                'relative flex flex-col gap-2 border-b border-border py-4',
                className,
            )}
            {...props}
        >
            <div className="flex flex-wrap items-center gap-2 px-5">
                <BoardAvatar slug={thread.board} size={20} decorative />
                <MachineValue className="text-foreground">
                    {thread.board}
                </MachineValue>
                <span className="text-caption text-muted-foreground">
                    {thread.boardName}
                </span>
                <span aria-hidden="true" className="text-faint">
                    &middot;
                </span>
                <span className="text-caption text-faint">{thread.time}</span>

                {/* The mark, beside the board it came from rather than over
                    the attachment: an anon needs to know what a row is before
                    they decide to look at it, and a label on the image is
                    already too late. Named in words, not signalled by colour,
                    so it survives greyscale and a screen reader. */}
                {thread.nsfw ? <Badge tone="danger">NSFW</Badge> : null}

                {thread.pinned ? (
                    <Badge tone="primary" className="ml-auto">
                        Pinned
                    </Badge>
                ) : null}

                {meta ? (
                    <span className="ml-auto text-caption text-faint">
                        {meta}
                    </span>
                ) : null}
            </div>

            <h3 className="px-5 font-display text-[17px] leading-snug font-semibold text-balance text-foreground">
                {/* The hover lives on the title and nowhere else.
                    
                    The row used to tint entirely, which is a lot of movement
                    for a pointer that happens to cross a feed, and it made
                    thirty rows flicker on the way down the page. The title is
                    the thing being pointed at and the only thing that
                    navigates, so it is the only thing that reacts. The
                    stretched pseudo-element still makes the whole row
                    clickable; it just no longer announces itself. */}
                <Link
                    href={titleHref}
                    className="static transition-colors duration-[var(--duration-hover)] ease-standard after:absolute after:inset-0 after:content-[''] hover:text-primary"
                >
                    {thread.title}
                </Link>
            </h3>

            {/* Thumbnail only. A feed of thirty rows fetching originals would
                pull tens of megabytes for images most anons scroll past; the
                full file loads when one is opened. */}
            {thread.media ? (
                <div className="relative px-5">
                    <PostAttachment media={thread.media} />
                </div>
            ) : null}

            <div className="relative flex items-center gap-5 px-5">
                {/* Both stats name their own unit. An icon plus a bare number
                    reads as "318" to a screen reader, which is a figure with no
                    subject; the icon carries the meaning for sighted anons only. */}
                <span
                    aria-label={`${thread.replies} replies`}
                    className="flex items-center gap-1.5 text-caption text-faint"
                >
                    <MessageSquare aria-hidden="true" className="size-4" />
                    <MachineValue aria-hidden="true">
                        {thread.replies}
                    </MachineValue>
                </span>
                <span
                    aria-label={`${thread.images} images`}
                    className="flex items-center gap-1.5 text-caption text-faint"
                >
                    <ImageIcon aria-hidden="true" className="size-4" />
                    <MachineValue aria-hidden="true">
                        {thread.images}
                    </MachineValue>
                </span>
                <ShareControl
                    url={titleHref}
                    title={thread.title}
                    size="sm"
                    className="ml-auto"
                />
                <button
                    type="button"
                    aria-label="Bookmark thread"
                    onClick={onBookmark}
                    className={iconButtonClasses}
                >
                    <Bookmark aria-hidden="true" className="size-4" />
                </button>
            </div>
        </div>
    );
}

export { ThreadCard };
export type { ThreadCardProps };
