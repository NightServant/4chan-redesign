import { Link, router, usePage } from '@inertiajs/react';
import { Archive, ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AuthGate } from '@/components/clover/auth-gate';
import { CommentTree } from '@/components/clover/comment-tree';
import { EmptyState } from '@/components/clover/empty-state';
import { MachineValue } from '@/components/clover/machine-value';
import { PageMeta } from '@/components/clover/page-meta';
import { SectionLabel } from '@/components/clover/section-label';
import { OriginalPost } from '@/components/thread/original-post';
import { ReplyComposer } from '@/components/thread/reply-composer';
import { Button } from '@/components/ui/button';
import { plural } from '@/lib/utils';
import { board } from '@/routes';
import { store as storeReply } from '@/routes/replies';
import {
    bookmark as bookmarkThread,
    read as recordRead,
} from '@/routes/threads';
import type { BoardSlug, Comment, Thread as ThreadType } from '@/types/clover';

/**
 * A single thread, e.g. `/g/58210441`.
 *
 * `no` is a route parameter constrained to digits, not a foreign key: any
 * number reaches this page, and most of them do not match a thread. That is
 * the ordinary case, not an exceptional one, so it gets a real not-found
 * state rather than a crash or a blank screen.
 *
 * Reading is open to everyone. Replying and bookmarking
 * all require an account, and a signed-out anon pressing any of those
 * controls opens `AuthGate` rather than doing nothing.
 */
type ThreadPageProps = {
    slug: BoardSlug;
    no: number;
    /** Null when the post number matches nothing, which is the ordinary case. */
    thread: ThreadType | null;
    /** Nested server-side from the flat post list 4chan returns. */
    comments: Comment[];
    /** This board's own `max_comment_chars`, not a global constant. */
    maxCommentChars: number;
};

/** `/g/` becomes `g`, the bare form the `board` route expects. */
function boardToken(slug: string): string {
    return slug.replace(/\//g, '');
}

export default function Thread({
    slug,
    no,
    thread,
    comments,
    maxCommentChars,
}: ThreadPageProps) {
    const { auth } = usePage().props;
    const signedIn = Boolean(auth.user);

    const [authGateAction, setAuthGateAction] = useState<string | null>(null);

    /**
     * Reading a thread records that it was read.
     *
     * Fired once per thread rather than on every render, and only for a
     * signed-in anon — there is nowhere to record it otherwise. `only: []`
     * keeps the response empty: this is a write, and re-rendering the page
     * around it would fight the scroll position an anon is reading at.
     *
     * Progress is left at nought here. Tracking how far down someone scrolled
     * is a real feature and inventing a number for it would be worse than
     * admitting the page has not measured one.
     */
    const threadId = thread?.id;

    useEffect(() => {
        if (!signedIn || threadId === undefined) {
            return;
        }

        router.post(
            recordRead(threadId).url,
            {},
            { preserveScroll: true, preserveState: true, only: [] },
        );
    }, [signedIn, threadId]);

    function requireAuth(action: string, perform: () => void) {
        if (!signedIn) {
            setAuthGateAction(action);

            return;
        }

        perform();
    }

    /**
     * A reply is stored and never sent upstream: 4chan's API accepts GET,
     * HEAD and OPTIONS only, so nothing written here reaches the board being
     * read. The composer has said so since it was built; this is what finally
     * makes it true rather than a comment.
     */
    function handleReply(body: string, media: File | null) {
        if (!thread) {
            return;
        }

        /* Inertia switches to multipart on its own once a `File` is in the
           payload, so the attachment needs no special casing here — only that
           the key is absent rather than null when there is nothing to send. */
        router.post(
            storeReply({ board: boardToken(slug), thread: thread.no }).url,
            media === null ? { body } : { body, media },
            { preserveScroll: true },
        );
    }

    function toggleBookmark() {
        if (!thread) {
            return;
        }

        const url = bookmarkThread(thread.id).url;

        if (thread.bookmarked) {
            router.delete(url, { preserveScroll: true });

            return;
        }

        router.post(url, {}, { preserveScroll: true });
    }

    if (!thread) {
        return (
            <>
                <PageMeta
                    title="Thread not found"
                    description="This thread is no longer on Clover. 4chan prunes threads off the end of a board and Clover does not keep what it has dropped."
                />

                <div className="mx-auto max-w-[760px] px-6 py-8">
                    {/* Naming the post number matters: an anon arriving from
                        a stale `>>` reference wants to know which one missed,
                        and it is the only thing distinguishing this screen
                        from every other pruned thread. */}
                    <EmptyState
                        icon={<Archive />}
                        title={`Thread >>${no} is not here`}
                        body="It was pruned, deleted, or never existed. Board archives keep threads for 72 hours."
                        action={
                            <Button variant="outline" asChild>
                                <Link href={board({ board: boardToken(slug) })}>
                                    Back to {slug}
                                </Link>
                            </Button>
                        }
                    />
                </div>
            </>
        );
    }

    return (
        <>
            <PageMeta
                type="article"
                title={thread.title}
                description={`${plural(thread.replies, 'reply', 'replies')} on ${thread.board}. Read it on Clover without an account.`}
            />

            <div className="mx-auto flex max-w-[760px] flex-col gap-6 px-6 py-8">
                <Link
                    href={board({ board: boardToken(thread.board) })}
                    className="inline-flex w-fit items-center gap-1.5 text-body-sm text-muted-foreground transition-colors duration-[var(--duration-hover)] ease-standard hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                    <ArrowLeft aria-hidden="true" className="size-4" />
                    Back to {thread.board}
                </Link>

                <OriginalPost
                    thread={thread}
                    onBookmark={() =>
                        requireAuth('bookmark this thread', toggleBookmark)
                    }
                />

                <SectionLabel>
                    <MachineValue className="text-label font-semibold tracking-[1.2px] text-faint uppercase">
                        {thread.replies}
                    </MachineValue>{' '}
                    replies
                </SectionLabel>

                {signedIn ? (
                    <ReplyComposer
                        threadNo={thread.no}
                        maxCommentChars={maxCommentChars}
                        onReply={handleReply}
                    />
                ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-b border-border py-5">
                        <p className="text-body-sm text-muted-foreground">
                            Sign in to add your own reply to this thread.
                        </p>
                        <Button
                            variant="primary"
                            onClick={() =>
                                setAuthGateAction('reply to this thread')
                            }
                        >
                            Reply to this thread
                        </Button>
                    </div>
                )}

                <CommentTree comments={comments} />
            </div>

            <AuthGate
                action={authGateAction ?? ''}
                open={authGateAction !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setAuthGateAction(null);
                    }
                }}
            />
        </>
    );
}
