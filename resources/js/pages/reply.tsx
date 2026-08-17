import { Link, router } from '@inertiajs/react';
import { ImagePlus, X } from 'lucide-react';
import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { MachineValue } from '@/components/clover/machine-value';
import { PageMeta } from '@/components/clover/page-meta';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { store as storeReply } from '@/routes/replies';

/**
 * Writing a reply, as a screen of its own.
 *
 * The thread page's inline composer is right with a mouse and a full window.
 * On a phone it is a two-line box under two hundred comments with the keyboard
 * over the top of it, so below `md` the thread page offers this instead: the
 * field gets the viewport, the attachment control has room, and Post sits
 * where a thumb can reach it.
 *
 * Reddit's composer screen is the shape — close, title, Post, the thread for
 * context, the field, a toolbar along the bottom. Its toolbar carries link,
 * image, GIF and video tools; this one carries the single image
 * `ReplyController` accepts, because a toolbar offering what the server will
 * reject is a toolbar that lies.
 *
 * It posts to `replies.store` — the route the inline composer already uses.
 * One endpoint, one set of validation rules, one numbering scheme; this is a
 * second surface, not a second implementation.
 */
type ReplyPageProps = {
    thread: {
        no: number;
        board: string;
        /** The subject, or the OP's opening line where a thread has none. */
        title: string;
    };
    /** The board's own limit, so the counter agrees with the validator. */
    maxCommentChars: number;
};

/** Mirrors `clover.attachments.mimes`, as the inline composer does. */
const ACCEPT = 'image/jpeg,image/png,image/gif,image/webp';

export default function Reply({ thread, maxCommentChars }: ReplyPageProps) {
    const [body, setBody] = useState('');
    /**
     * The file and its preview URL together, created and revoked together.
     * Deriving the URL in an effect would be a `setState` inside an effect —
     * the shape this codebase's lint rule has caught twice.
     */
    const [attachment, setAttachment] = useState<{
        file: File;
        preview: string;
    } | null>(null);
    const fileInput = useRef<HTMLInputElement>(null);

    const threadPath = `${thread.board}${thread.no}`;
    /* The server's own rule: `body` is `required_without:media`. A picture
       with no words is the most ordinary reply on an imageboard, so Post is
       live for that too, and dead only when there is genuinely nothing to
       send. */
    const canPost = body.trim() !== '' || attachment !== null;

    function pickFile(event: ChangeEvent<HTMLInputElement>): void {
        const file = event.target.files?.[0] ?? null;

        if (file === null) {
            return;
        }

        if (attachment !== null) {
            URL.revokeObjectURL(attachment.preview);
        }

        setAttachment({ file, preview: URL.createObjectURL(file) });
    }

    function clearFile(): void {
        if (attachment !== null) {
            URL.revokeObjectURL(attachment.preview);
        }

        setAttachment(null);

        if (fileInput.current) {
            fileInput.current.value = '';
        }
    }

    function submit(event: FormEvent): void {
        event.preventDefault();

        if (!canPost) {
            return;
        }

        const trimmed = body.trim();

        /* Inertia switches to multipart on its own once a `File` is in the
           payload, so the key is simply absent when there is nothing to
           attach rather than present and null. */
        router.post(
            storeReply({
                board: thread.board.replaceAll('/', ''),
                thread: thread.no,
            }).url,
            attachment === null
                ? { body: trimmed }
                : { body: trimmed, media: attachment.file },
            { preserveScroll: false },
        );
    }

    return (
        <>
            <PageMeta
                title="Add reply"
                description={`Reply to ${thread.title} on ${thread.board}.`}
            />

            <form
                onSubmit={submit}
                className="mx-auto flex min-h-dvh w-full max-w-(--measure-column) flex-col"
            >
                {/* The app bar: close, what this screen is, and the action.
                    Sticky rather than scrolling away, because Post is the
                    only way off this screen that keeps what was written. */}
                <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-bg px-4 py-3">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href={threadPath} aria-label="Close">
                            <X aria-hidden="true" />
                        </Link>
                    </Button>

                    <span className="min-w-0 flex-1 truncate text-body-sm font-semibold text-foreground">
                        Add reply
                    </span>

                    <Button type="submit" size="sm" disabled={!canPost}>
                        Post
                    </Button>
                </header>

                {/* What is being replied to. The board and the thread's own
                    name, because an anon who tapped a reply box two hundred
                    comments down should not have to remember which thread
                    they were in. */}
                <div className="flex flex-col gap-1 border-b border-border px-4 py-3">
                    <MachineValue>{thread.board}</MachineValue>
                    <p className="text-body-sm text-pretty break-words text-muted-foreground">
                        {thread.title}
                    </p>
                </div>

                <Textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    maxLength={maxCommentChars}
                    aria-label="Reply"
                    placeholder="Say something"
                    /* The field is the screen: it takes whatever height is
                       left between the bar above and the toolbar below,
                       rather than being a three-row box on a page of empty
                       paper. */
                    className="min-h-0 flex-1 resize-none rounded-none border-0 px-4 py-4 text-body focus-visible:ring-0"
                />

                {attachment !== null ? (
                    <div className="flex items-center gap-3 border-t border-border px-4 py-3">
                        <img
                            src={attachment.preview}
                            alt=""
                            className="size-14 rounded-md border border-border object-cover"
                        />
                        <span className="min-w-0 flex-1 truncate text-meta text-muted-foreground">
                            {attachment.file.name}
                        </span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={clearFile}
                        >
                            Remove
                        </Button>
                    </div>
                ) : null}

                {/* One control, because one image is what the server takes.
                    The reference's link, GIF and video tools have nothing
                    behind them here. */}
                <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-border bg-bg px-4 py-3">
                    <input
                        ref={fileInput}
                        type="file"
                        accept={ACCEPT}
                        onChange={pickFile}
                        aria-hidden="true"
                        tabIndex={-1}
                        className="sr-only"
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Attach image"
                        onClick={() => fileInput.current?.click()}
                    >
                        <ImagePlus aria-hidden="true" />
                    </Button>

                    <MachineValue className="text-faint">
                        {`${body.length} / ${maxCommentChars}`}
                    </MachineValue>
                </div>
            </form>
        </>
    );
}
