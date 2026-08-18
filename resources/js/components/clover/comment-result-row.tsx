import { Link } from '@inertiajs/react';
import type { ComponentProps } from 'react';
import { BoardAvatar } from '@/components/clover/board-avatar';
import { MachineValue } from '@/components/clover/machine-value';
import { ResultThumbnail } from '@/components/clover/result-thumbnail';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CommentResult } from '@/types/clover';

/**
 * One reply, as the Comments tab of the search page lists it.
 *
 * The same row vocabulary as a thread — board identity and age on one line,
 * the heading beneath, a meta line, a thumbnail at the trailing edge — but a
 * reply is not a thread and cannot be a `ThreadCard`: it has no reply count of
 * its own, nothing to bookmark, and its heading is the thread it answers
 * rather than anything it names itself.
 *
 * The link goes to the reply, not merely to the thread it is in. The thread
 * page anchors every reply as `#p{no}`, which is the same anchor its own share
 * control copies, so a result that matched on the fourteenth reply lands on
 * the fourteenth reply.
 *
 * The meta line carries what this application counts: the board and the post
 * number. There is no score on it, because Clover has no votes.
 */
type CommentResultRowProps = Omit<ComponentProps<'div'>, 'children'> & {
    comment: CommentResult;
};

function CommentResultRow({
    comment,
    className,
    ...props
}: CommentResultRowProps) {
    const href = `${comment.board}${comment.threadNo}#p${comment.no}`;

    return (
        <div
            data-slot="comment-result-row"
            className={cn(
                /* Same hover as a thread row, since it is the same shape of
                   row: the whole box is the target, so the surface and the
                   title answer together rather than the title alone. */
                'group relative flex flex-col gap-2 rounded-xl border-b border-border py-4',
                'transition-[background-color] duration-[var(--duration-hover)] ease-standard hover:bg-surface-hover',
                className,
            )}
            {...props}
        >
            <div className="flex flex-wrap items-center gap-2">
                <BoardAvatar slug={comment.board} size={20} decorative />
                <MachineValue className="text-foreground">
                    {comment.board}
                </MachineValue>
                <span className="text-caption text-muted-foreground">
                    {comment.boardName}
                </span>
                <span aria-hidden="true" className="text-faint">
                    &middot;
                </span>
                <span className="text-caption text-faint">{comment.time}</span>

                {comment.nsfw ? <Badge tone="danger">NSFW</Badge> : null}
            </div>

            <div className="flex items-start gap-3">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <h3 className="font-display text-[17px] leading-snug font-semibold text-foreground">
                        {/* Stretched over the row, as a thread row's title is:
                            the whole row is clickable, and the accessible
                            target stays the one link. */}
                        <Link
                            href={href}
                            className="static transition-colors duration-[var(--duration-hover)] ease-standard group-hover:text-primary after:absolute after:inset-0 after:content-['']"
                        >
                            {comment.threadTitle}
                        </Link>
                    </h3>

                    <p className="line-clamp-3 text-body-sm text-muted-foreground">
                        {comment.body}
                    </p>

                    <MachineValue className="text-faint">
                        {comment.board} &middot; &gt;&gt;{comment.no}
                    </MachineValue>
                </div>

                <ResultThumbnail media={comment.media} />
            </div>
        </div>
    );
}

export { CommentResultRow };
export type { CommentResultRowProps };
