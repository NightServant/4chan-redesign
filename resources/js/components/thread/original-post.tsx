import { Link } from '@inertiajs/react';
import { Bookmark, ImageIcon, MessageSquare } from 'lucide-react';
import { BoardAvatar } from '@/components/clover/board-avatar';
import { MachineValue } from '@/components/clover/machine-value';
import { PostBody } from '@/components/clover/post-body';
import { PostAttachment } from '@/components/clover/post-image';
import { ShareControl } from '@/components/clover/share-control';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { board } from '@/routes';
import type { Thread } from '@/types/clover';

/**
 * The thread's opening post, rendered in full rather than as the summary
 * `ThreadCard` shows in a feed.
 *
 * Deliberately not a `ThreadCard` and does not import one: a card is the
 * compact read a list shows before you have committed to a thread, and this
 * page exists because you already have. It is also not a card sitting on the
 * page: wrapping it in a `Card` (or a `Panel`, which is one) would nest a
 * surface inside the page's own content, which the taste laws rule out
 * outright. A hairline under the post does the same separating job a border
 * would without adding a box — the same choice `BoardHeader` makes above the
 * thread list it sits on.
 */
type OriginalPostProps = {
    thread: Thread;
    /** Held by the caller: this component owns no state of its own. */
    bookmarked?: boolean;
    onBookmark?: () => void;
    className?: string;
};

const footerButtonClasses = cn(
    'inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-caption font-medium text-muted-foreground',
    'transition-colors duration-[var(--duration-hover)] ease-standard',
    'hover:not-disabled:bg-surface-hover hover:not-disabled:text-foreground',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
);

/** `/g/` becomes `g`, matching the bare form the `board` route expects. */
function boardToken(slug: Thread['board']): string {
    return slug.replace(/\//g, '');
}

function OriginalPost({
    thread,
    bookmarked = false,
    onBookmark,
    className,
}: OriginalPostProps) {
    return (
        <article
            aria-labelledby="original-post-title"
            data-slot="original-post"
            className={cn(
                'flex flex-col gap-4 border-b border-border pb-6',
                className,
            )}
        >
            <div className="flex flex-wrap items-center gap-2">
                <BoardAvatar slug={thread.board} size={28} decorative />
                <Link
                    href={board({ board: boardToken(thread.board) })}
                    className="inline-flex items-center gap-1.5 rounded-sm text-body-sm font-medium text-foreground transition-colors duration-[var(--duration-hover)] ease-standard hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                    <MachineValue className="text-foreground">
                        {thread.board}
                    </MachineValue>{' '}
                    <span>{thread.boardName}</span>
                </Link>
                <span aria-hidden="true" className="text-faint">
                    &middot;
                </span>
                <span className="text-caption text-faint">{thread.time}</span>
                <span aria-hidden="true" className="text-faint">
                    &middot;
                </span>
                <MachineValue>{`>>${thread.no}`}</MachineValue>
                {thread.pinned ? (
                    <Badge tone="primary" className="ml-auto">
                        Pinned
                    </Badge>
                ) : null}
            </div>

            <h1
                id="original-post-title"
                className="font-display text-h1 font-semibold text-pretty text-foreground"
            >
                {thread.title}
            </h1>

            {/* The opening post's body, not a summary of it: a real 4chan OP
                runs to several lines, quotes other posts and uses greentext.
                Rendered as `{thread.excerpt}` inside one `<p>` it collapsed into
                a single run-on paragraph with the `>` lines reading as literal
                punctuation. `PostBody` is what makes the greentext the README
                promises actually appear. */}
            {thread.excerpt ? (
                <PostBody
                    body={thread.excerpt}
                    className="max-w-prose text-body text-pretty text-foreground"
                />
            ) : null}

            {/* The thread being read, so the file itself rather than a
                250px thumbnail of it. */}
            <PostAttachment media={thread.media} variant="post" />

            <footer className="flex flex-wrap items-center gap-5">
                {/* The thread's own address, built the same way the card
                    builds it, rather than whatever is in the address bar — a
                    share should survive being sent from a URL carrying a
                    fragment or a query string. */}
                {/* One share control, not two.
                
                    This footer carried a hand-rolled Share button as well,
                    down at `ml-auto`, so the opened thread showed the word
                    "Share" twice on one row -- at both ends of it. The
                    hand-rolled one went: `ShareControl` is the tested
                    component, it uses the native share sheet where there is
                    one, and it falls back to the clipboard where there is
                    not. */}
                <ShareControl
                    url={`${thread.board}${thread.no}`}
                    title={thread.title}
                />
                {/* `thread.views` used to sit here. Nothing upstream counts
                    views and nothing here counted them either, so the footer now
                    reports attached images, which the catalogue genuinely
                    returns. Each stat names its own unit for the same reason the
                    card does: an icon plus a bare number is a figure with no
                    subject to anyone not looking at the icon. */}
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
                <button
                    type="button"
                    aria-pressed={bookmarked}
                    aria-label="Bookmark thread"
                    onClick={onBookmark}
                    className={cn(
                        footerButtonClasses,
                        bookmarked && 'text-primary',
                    )}
                >
                    <Bookmark
                        aria-hidden="true"
                        className={cn('size-4', bookmarked && 'fill-current')}
                    />
                </button>
            </footer>
        </article>
    );
}

export { OriginalPost };
export type { OriginalPostProps };
