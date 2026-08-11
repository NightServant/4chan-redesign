import { Head, Link, usePage } from '@inertiajs/react';
import { Archive, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { AuthGate } from '@/components/clover/auth-gate';
import { CommentTree } from '@/components/clover/comment-tree';
import { EmptyState } from '@/components/clover/empty-state';
import { MachineValue } from '@/components/clover/machine-value';
import { SectionLabel } from '@/components/clover/section-label';
import { OriginalPost } from '@/components/thread/original-post';
import { ReplyComposer } from '@/components/thread/reply-composer';
import { Button } from '@/components/ui/button';
import { board } from '@/routes';
import type { BoardSlug, Comment, Thread as ThreadType } from '@/types/clover';

/**
 * A single thread, e.g. `/g/58210441`.
 *
 * `no` is a route parameter constrained to digits, not a foreign key: any
 * number reaches this page, and most of them do not match a thread. That is
 * the ordinary case, not an exceptional one, so it gets a real not-found
 * state rather than a crash or a blank screen.
 *
 * Reading is open to everyone. Replying, blessing, cursing and bookmarking
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

    function requireAuth(action: string, perform: () => void) {
        if (!signedIn) {
            setAuthGateAction(action);

            return;
        }

        perform();
    }

    /**
     * There is no backend: a reply lands nowhere and would vanish on reload.
     * Logged rather than faked as a persisted post, so nothing here pretends
     * to have succeeded.
     */
    function handleReply(body: string) {
        console.info('Simulated reply (no backend yet):', body);
    }

    if (!thread) {
        return (
            <>
                <Head title="Thread not found" />

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
            <Head title={thread.title} />

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
                    onBless={() => requireAuth('bless this post', () => {})}
                    onCurse={() => requireAuth('curse this post', () => {})}
                    onBookmark={() =>
                        requireAuth('bookmark this thread', () => {})
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
