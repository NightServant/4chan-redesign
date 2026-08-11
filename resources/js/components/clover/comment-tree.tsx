import {
    ChevronDown,
    ChevronRight,
    Reply as ReplyIcon,
    Sparkles,
} from 'lucide-react';
import { useId, useState } from 'react';
import { AnonAvatar } from '@/components/clover/anon-avatar';
import { MachineValue } from '@/components/clover/machine-value';
import { PostBody } from '@/components/clover/post-body';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Comment } from '@/types/clover';

/**
 * Nested replies on a thread.
 *
 * `Comment` is recursive, so this renders as a real nested list: an `<ol>`
 * per level, an `<li>` per reply. That is what lets a screen reader report
 * depth and position on its own, instead of a pile of divs that all sound
 * the same.
 *
 * Indentation is a left border plus padding on each nested list. Because the
 * lists nest in the DOM the same way the data nests, going one level deeper
 * automatically compounds the indent and adds exactly one more hairline —
 * no depth-to-pixel arithmetic required.
 *
 * Voting is out of scope here: another component owns the blessing control.
 * The footer only reports the count.
 */

const iconButtonClasses = cn(
    'inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-caption font-medium text-faint',
    'transition-colors duration-[var(--duration-hover)] ease-standard',
    'hover:not-disabled:bg-surface-hover hover:not-disabled:text-foreground',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
);

/** Total replies nested under a comment, at any depth. Used to tell you what
 * a collapsed row or a depth cap actually hid, rather than just that it did. */
function countDescendants(comment: Comment): number {
    return comment.replies.reduce(
        (total, reply) => total + 1 + countDescendants(reply),
        0,
    );
}

function repliesLabel(count: number): string {
    return count === 1 ? '1 reply' : `${count} replies`;
}

type CommentTreeProps = {
    comments: readonly Comment[];
    /** How many levels indent before nesting flattens into a "Continue this
     * thread" affordance. */
    maxDepth?: number;
    /** Fires when a reply's own Reply affordance is pressed. */
    onReply?: (comment: Comment) => void;
    /** Fires when a `>>` quote reference is pressed. */
    onQuoteClick?: (quoteNo: number, comment: Comment) => void;
    /** Fires when a "Continue this thread" affordance past `maxDepth` is
     * pressed. */
    onContinueThread?: (comment: Comment) => void;
    className?: string;
};

type CommentNodeProps = {
    comment: Comment;
    depth: number;
    maxDepth: number;
    onReply?: (comment: Comment) => void;
    onQuoteClick?: (quoteNo: number, comment: Comment) => void;
    onContinueThread?: (comment: Comment) => void;
};

function ContinueThread({
    count,
    onClick,
}: {
    count: number;
    onClick?: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="mt-3 inline-flex items-center gap-1 text-caption font-medium text-accent-text transition-colors duration-[var(--duration-hover)] ease-standard hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
            Continue this thread ({repliesLabel(count)})
        </button>
    );
}

function CommentNode({
    comment,
    depth,
    maxDepth,
    onReply,
    onQuoteClick,
    onContinueThread,
}: CommentNodeProps) {
    const [collapsed, setCollapsed] = useState(false);
    const headingId = useId();
    const hasReplies = comment.replies.length > 0;
    const hiddenCount = countDescendants(comment);
    const childDepth = depth + 1;
    const cappedAtDepth = hasReplies && childDepth > maxDepth;

    return (
        <li>
            <article
                aria-labelledby={headingId}
                className="flex flex-col gap-2 py-2"
            >
                <div className="flex items-start justify-between gap-2">
                    <div
                        id={headingId}
                        className="flex flex-wrap items-center gap-2"
                    >
                        <AnonAvatar
                            seed={String(comment.no)}
                            variant={comment.op ? 'op' : 'anon'}
                            size={24}
                        />
                        <span className="text-body-sm font-medium text-foreground">
                            {comment.author}
                        </span>
                        {comment.op && <Badge tone="primary">OP</Badge>}
                        <MachineValue>{`>>${comment.no}`}</MachineValue>
                        <span className="text-caption text-faint">
                            {comment.time}
                        </span>
                    </div>
                    <button
                        type="button"
                        aria-expanded={!collapsed}
                        aria-label={`${collapsed ? 'Expand' : 'Collapse'} post ${comment.no}`}
                        onClick={() => setCollapsed((current) => !current)}
                        className="flex size-6 shrink-0 items-center justify-center rounded-md text-faint transition-colors duration-[var(--duration-hover)] ease-standard hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                        {collapsed ? (
                            <ChevronRight
                                aria-hidden="true"
                                className="size-4"
                            />
                        ) : (
                            <ChevronDown
                                aria-hidden="true"
                                className="size-4"
                            />
                        )}
                    </button>
                </div>

                {collapsed ? (
                    hasReplies && (
                        <p className="text-caption text-faint">
                            {repliesLabel(hiddenCount)} hidden
                        </p>
                    )
                ) : (
                    <>
                        {comment.quotes.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {comment.quotes.map((quoteNo) => (
                                    <button
                                        key={quoteNo}
                                        type="button"
                                        onClick={() =>
                                            onQuoteClick?.(quoteNo, comment)
                                        }
                                        className={iconButtonClasses}
                                    >
                                        <MachineValue className="text-accent-text">{`>>${quoteNo}`}</MachineValue>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* `{comment.body}` in a single `<p>` was fine against
                            fixtures, whose bodies were one tidy sentence each.
                            Real replies are multi-line and lean on greentext, and
                            a plain text node collapses every newline: the whole
                            reply arrived as one run-on paragraph with `>` lines
                            reading as stray punctuation. `PostBody` does the line
                            splitting and the greentext, from plain text and
                            without `dangerouslySetInnerHTML`. */}
                        <PostBody
                            body={comment.body}
                            className="max-w-prose text-body-sm text-foreground"
                        />

                        <footer className="flex items-center gap-3">
                            <span
                                aria-label={`${comment.blessings} blessings`}
                                className="inline-flex items-center gap-1 text-caption text-faint"
                            >
                                <Sparkles
                                    aria-hidden="true"
                                    className="size-3.5"
                                />
                                <MachineValue aria-hidden="true">
                                    {comment.blessings}
                                </MachineValue>
                            </span>
                            <button
                                type="button"
                                onClick={() => onReply?.(comment)}
                                className={iconButtonClasses}
                            >
                                <ReplyIcon
                                    aria-hidden="true"
                                    className="size-3.5"
                                />
                                Reply
                            </button>
                        </footer>
                    </>
                )}
            </article>

            {!collapsed &&
                hasReplies &&
                (cappedAtDepth ? (
                    <ContinueThread
                        count={hiddenCount}
                        onClick={() => onContinueThread?.(comment)}
                    />
                ) : (
                    <ol
                        role="list"
                        className="mt-3 flex flex-col gap-3 border-l border-border pl-4"
                    >
                        {comment.replies.map((reply) => (
                            <CommentNode
                                key={reply.no}
                                comment={reply}
                                depth={childDepth}
                                maxDepth={maxDepth}
                                onReply={onReply}
                                onQuoteClick={onQuoteClick}
                                onContinueThread={onContinueThread}
                            />
                        ))}
                    </ol>
                ))}
        </li>
    );
}

function CommentTree({
    comments,
    maxDepth = 4,
    onReply,
    onQuoteClick,
    onContinueThread,
    className,
}: CommentTreeProps) {
    if (comments.length === 0) {
        return null;
    }

    return (
        <ol
            role="list"
            aria-label="Replies"
            data-slot="comment-tree"
            className={cn('flex flex-col gap-4', className)}
        >
            {comments.map((comment) => (
                <CommentNode
                    key={comment.no}
                    comment={comment}
                    depth={1}
                    maxDepth={maxDepth}
                    onReply={onReply}
                    onQuoteClick={onQuoteClick}
                    onContinueThread={onContinueThread}
                />
            ))}
        </ol>
    );
}

export { CommentTree };
export type { CommentTreeProps };
