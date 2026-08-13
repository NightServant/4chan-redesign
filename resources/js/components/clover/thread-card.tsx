import { Link } from '@inertiajs/react';
import { Bookmark, ImageIcon, MessageSquare } from 'lucide-react';
import type { ComponentProps } from 'react';
import { BoardAvatar } from '@/components/clover/board-avatar';
import { MachineValue } from '@/components/clover/machine-value';
import { PostAttachment } from '@/components/clover/post-image';
import { ShareControl } from '@/components/clover/share-control';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Thread } from '@/types/clover';

/**
 * One thread as it appears in a feed.
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
    className,
    ...props
}: ThreadCardProps) {
    const titleHref = href ?? `${thread.board}${thread.no}`;

    return (
        <Card
            data-slot="thread-card"
            className={cn(
                'relative gap-3 py-4 transition-shadow duration-[var(--duration-hover)] ease-standard hover:shadow-lift',
                className,
            )}
            {...props}
        >
            <div className="flex items-center gap-2 px-5">
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
                {thread.pinned ? (
                    <Badge tone="primary" className="ml-auto">
                        Pinned
                    </Badge>
                ) : null}
            </div>

            <h3 className="px-5 font-display text-h3 font-semibold text-foreground">
                <Link
                    href={titleHref}
                    className="static after:absolute after:inset-0 after:content-['']"
                >
                    {thread.title}
                </Link>
            </h3>

            {thread.excerpt ? (
                <p className="line-clamp-2 px-5 text-body-sm text-pretty text-muted-foreground">
                    {thread.excerpt}
                </p>
            ) : null}

            {/* Thumbnail only. A feed of thirty cards fetching originals
                would pull tens of megabytes for images most anons scroll
                past; the full file loads when one is opened. */}
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
        </Card>
    );
}

export { ThreadCard };
export type { ThreadCardProps };
