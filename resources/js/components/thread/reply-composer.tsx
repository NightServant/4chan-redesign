import { ImagePlus, TriangleAlert, X } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { AnonAvatar } from '@/components/clover/anon-avatar';
import { FormField } from '@/components/clover/form-field';
import { MachineValue } from '@/components/clover/machine-value';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { POST_MAX_LENGTH } from '@/lib/posting';
import { cn } from '@/lib/utils';

export interface ReplyComposerProps {
    /** The thread being replied to. Seeds the composer's own anon mark. */
    threadNo: number;
    /**
     * The board's own `max_comment_chars`, which is 2000, 3000 or 5000
     * depending on the board. Passed down by the thread page, which is the
     * only layer that knows which board this thread lives on. Defaults to the
     * shared fallback for callers with no board in hand.
     */
    maxCommentChars?: number;
    /**
     * Fires with the typed body and any attached image when a reply is posted.
     *
     * Returning `false` — or a promise resolving to it — means the server
     * refused, and the composer keeps what was typed. Anything else, `void`
     * included, is taken as stored. The caller owns the request, so it is the
     * only thing that can know, and until it reported back this component
     * cleared the field the instant a submit was attempted.
     */
    onReply?: (
        body: string,
        media: File | null,
    ) => void | boolean | Promise<boolean | void>;
    /**
     * A validation message from the server for the body, shown against the
     * field. Passed down rather than read from `usePage()` here, because this
     * component is rendered in two places and only one of them is a page.
     */
    error?: string;
    /**
     * Hands the caller a way to quote a post into this field.
     *
     * A prop carrying the post number and an effect writing it into the body
     * was the obvious shape, and it is the one `react-hooks` rejects: a
     * `setState` inside an effect is a cascading render, and this file already
     * carries a docblock agreeing with that rule about the attachment URL. So
     * the caller gets a function and calls it from the event instead, which is
     * where the state change belongs.
     *
     * This is what the Reply control on each comment drives. Without anywhere
     * for it to land it had nothing to do, which is precisely why it did
     * nothing.
     */
    onReady?: (api: { quote: (no: number) => void }) => void;
    /**
     * What the server will accept, so the picker offers the same set the
     * validator does. A file dialog listing formats the request will reject is
     * a dialog that lies.
     */
    accept?: string;
    className?: string;
}

/** Mirrors `clover.attachments.mimes`. */
const DEFAULT_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp';

/**
 * The inline form at the foot of a thread.
 *
 * Not a dialog: replying is the primary action on a thread page, and hiding
 * it behind a modal would bury it. There is no backend behind this, so
 * submitting only hands the body up to the caller and clears the field, the
 * way the rest of Clover's fixtures simulate a write without one.
 */
export function ReplyComposer({
    threadNo,
    maxCommentChars = POST_MAX_LENGTH,
    onReply,
    error,
    onReady,
    accept = DEFAULT_ACCEPT,
    className,
}: ReplyComposerProps) {
    const [body, setBody] = useState('');
    /**
     * The file and its preview URL together, because they are created and
     * destroyed together.
     *
     * The first version held the file in state and derived the URL in an
     * effect, which is a `setState` inside an effect — a cascading render, and
     * the lint rule that flags it is right. Making the URL at the moment the
     * file is chosen means one state update per pick and one obvious place to
     * revoke the previous one.
     */
    const [attachment, setAttachment] = useState<{
        file: File;
        url: string;
    } | null>(null);
    const fileInput = useRef<HTMLInputElement>(null);
    const field = useRef<HTMLTextAreaElement>(null);
    const baseId = useId();
    const hintId = `${baseId}-hint`;
    const counterId = `${baseId}-counter`;
    const mediaId = `${baseId}-media`;

    const trimmed = body.trim();
    const overLimit = body.length > maxCommentChars;

    /* An image on its own is a post. A reply that is only a picture is the
       most ordinary thing on an image board, and requiring a body to go with
       it would be Clover inventing a rule 4chan does not have. */
    const canSubmit = (trimmed.length > 0 || attachment !== null) && !overLimit;

    /**
     * An object URL is a leak until it is revoked: the browser holds the file
     * alive behind it for the lifetime of the document. Every path that
     * replaces one revokes it, and this covers the last one, on unmount.
     */
    useEffect(() => {
        return () => {
            if (attachment !== null) {
                URL.revokeObjectURL(attachment.url);
            }
        };
    }, [attachment]);

    /**
     * Append a `>>` reference and take focus.
     *
     * Appended to whatever is already typed rather than replacing it: an anon
     * halfway through a sentence who quotes a post has not asked to lose the
     * sentence. Quoting the same post twice writes it twice, because that is
     * what pressing Reply twice means.
     */
    const quote = useCallback((no: number): void => {
        setBody((current) => {
            const reference = `>>${no}`;

            if (current === '') {
                return `${reference}\n`;
            }

            return current.endsWith('\n')
                ? `${current}${reference}\n`
                : `${current}\n${reference}\n`;
        });

        field.current?.focus();
    }, []);

    /* Registration only -- no state changes here, which is the whole point of
       handing a function out rather than watching a prop. */
    useEffect(() => {
        onReady?.({ quote });
    }, [onReady, quote]);

    function handleFile(event: ChangeEvent<HTMLInputElement>): void {
        const file = event.target.files?.[0] ?? null;

        setAttachment((previous) => {
            if (previous !== null) {
                URL.revokeObjectURL(previous.url);
            }

            return file === null
                ? null
                : { file, url: URL.createObjectURL(file) };
        });
    }

    function clearMedia(): void {
        setAttachment((previous) => {
            if (previous !== null) {
                URL.revokeObjectURL(previous.url);
            }

            return null;
        });

        /* The input keeps its value after a clear, so picking the same file
           again would fire no change event and the attachment would not come
           back. */
        if (fileInput.current) {
            fileInput.current.value = '';
        }
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!canSubmit) {
            return;
        }

        /* The body and the file go up together; the page owns the request.
           The tree is not appended to here — the server has the reply and the
           page reloads its props, which is the only version of the thread
           worth rendering. */
        const stored = await onReply?.(trimmed, attachment?.file ?? null);

        /* Only on the caller's word. Clearing here unconditionally is what
           made a rejected reply lose everything an anon had written, in
           silence: the request had not finished, let alone succeeded. */
        if (stored === false) {
            return;
        }

        setBody('');
        clearMedia();
    }

    return (
        <form
            onSubmit={handleSubmit}
            className={cn('flex items-start gap-3', className)}
        >
            <AnonAvatar seed={String(threadNo)} className="mt-1" />

            <div className="flex flex-1 flex-col gap-2">
                <FormField label="Reply to this thread" error={error}>
                    <Textarea
                        ref={field}
                        value={body}
                        onChange={(event) => setBody(event.target.value)}
                        placeholder="Write a reply. Start a line with > for greentext."
                        aria-describedby={`${hintId} ${counterId}`}
                        rows={3}
                    />
                </FormField>

                <div
                    id={counterId}
                    className={cn(
                        'flex items-center gap-1 self-end',
                        overLimit && 'font-semibold text-danger',
                    )}
                >
                    {overLimit ? (
                        <TriangleAlert
                            aria-hidden="true"
                            className="size-3.5 shrink-0"
                        />
                    ) : null}
                    <MachineValue
                        className={overLimit ? 'text-danger' : undefined}
                    >
                        {body.length}/{maxCommentChars}
                    </MachineValue>
                    {overLimit ? (
                        <span className="text-caption font-medium">
                            Over the limit
                        </span>
                    ) : null}
                </div>

                {/* The attachment, shown at the size it will post at rather
                    than as a filename an anon has to take on trust. */}
                {attachment !== null ? (
                    <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                        <img
                            src={attachment.url}
                            alt={`Attached image: ${attachment.file.name}`}
                            className="max-h-32 rounded-md border border-border"
                        />

                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                            <span className="truncate text-body-sm text-foreground">
                                {attachment.file.name}
                            </span>
                            <MachineValue>
                                {Math.round(attachment.file.size / 1024)} KB
                            </MachineValue>
                        </div>

                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Remove attachment"
                            onClick={clearMedia}
                        >
                            <X aria-hidden="true" />
                        </Button>
                    </div>
                ) : null}

                <div className="flex items-center justify-between gap-3">
                    <p id={hintId} className="text-meta text-faint">
                        Start a line with &gt; for greentext, or &gt;&gt;
                        followed by a number to reference a post.
                    </p>

                    <div className="flex items-center gap-2">
                        {/* The input is the mechanism, the button is the
                            control.

                            A `sr-only` input is focusable but paints no focus
                            ring, so tabbing to it lands a keyboard user on
                            something they cannot see. It is taken out of the
                            tab order and the button beside it does the
                            opening, which keeps the visible focus ring on the
                            visible thing. Nothing is lost by hiding it from
                            assistive tech: the request is built in JavaScript
                            from `files[0]`, not from a native form post. */}
                        <input
                            ref={fileInput}
                            id={mediaId}
                            data-testid="reply-media"
                            type="file"
                            accept={accept}
                            onChange={handleFile}
                            tabIndex={-1}
                            aria-hidden="true"
                            className="sr-only"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInput.current?.click()}
                        >
                            <ImagePlus aria-hidden="true" />
                            Attach image
                        </Button>

                        <Button type="submit" disabled={!canSubmit}>
                            Post reply
                        </Button>
                    </div>
                </div>
            </div>
        </form>
    );
}
