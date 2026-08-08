import { Link } from '@inertiajs/react';
import { Bookmark, Eye, MessageSquare } from 'lucide-react';
import type { ComponentProps } from 'react';
import { BoardAvatar } from '@/components/clover/board-avatar';
import { MachineValue } from '@/components/clover/machine-value';
import { MediaPlaceholder } from '@/components/clover/media-placeholder';
import { VoteControl } from '@/components/clover/vote-control';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Thread } from '@/types/clover';

/**
 * One thread as it appears in a feed.
 *
 * The card reads as clickable everywhere, but the accessible target is the
 * title link alone. Nesting the vote and bookmark buttons inside that link
 * would be invalid HTML and would break their focus and keyboard behaviour,
 * so they stay siblings of it instead: the link stretches over the whole
 * card with a positioned pseudo-element (the "stretched link" pattern), and
 * the footer row is given `position: relative` so it paints above that
 * stretch and keeps its own buttons independently clickable and focusable.
 */
type ThreadCardProps = Omit<ComponentProps<'div'>, 'onClick' | 'children'> & {
    thread: Thread;
    onBless?: () => void;
    onCurse?: () => void;
    onBookmark?: () => void;
};

const iconButtonClasses = cn(
    'inline-flex size-8.5 shrink-0 items-center justify-center rounded-md text-muted-foreground',
    'transition-colors duration-[var(--duration-hover)] ease-standard hover:bg-surface-hover',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
);

function ThreadCard({
    thread,
    onBless,
    onCurse,
    onBookmark,
    className,
    ...props
}: ThreadCardProps) {
    const href = `${thread.board}${thread.no}`;

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
                    href={href}
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

            {thread.media ? (
                <div className="px-5">
                    <MediaPlaceholder label={thread.media} />
                </div>
            ) : null}

            <div className="relative flex items-center gap-5 px-5">
                <VoteControl
                    count={thread.blessings}
                    onBless={onBless}
                    onCurse={onCurse}
                    size="sm"
                />
                <span className="flex items-center gap-1.5 text-caption text-faint">
                    <MessageSquare aria-hidden="true" className="size-4" />
                    <MachineValue>{thread.replies}</MachineValue>
                </span>
                <span className="flex items-center gap-1.5 text-caption text-faint">
                    <Eye aria-hidden="true" className="size-4" />
                    <MachineValue>{thread.views}</MachineValue>
                </span>
                <button
                    type="button"
                    aria-label="Bookmark thread"
                    onClick={onBookmark}
                    className={cn(iconButtonClasses, 'ml-auto')}
                >
                    <Bookmark aria-hidden="true" className="size-4" />
                </button>
            </div>
        </Card>
    );
}

export { ThreadCard };
export type { ThreadCardProps };
