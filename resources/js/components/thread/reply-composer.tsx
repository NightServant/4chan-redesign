import { TriangleAlert } from 'lucide-react';
import { useId, useState } from 'react';
import type { FormEvent } from 'react';
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
    /** Fires with the typed body when a reply is posted. */
    onReply?: (body: string) => void;
    className?: string;
}

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
    onReply,
    className,
}: ReplyComposerProps) {
    const [body, setBody] = useState('');
    const baseId = useId();
    const hintId = `${baseId}-hint`;
    const counterId = `${baseId}-counter`;

    const trimmed = body.trim();
    const overLimit = body.length > POST_MAX_LENGTH;
    const canSubmit = trimmed.length > 0 && !overLimit;

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!canSubmit) {
            return;
        }

        // There is no backend: posting is simulated by handing the body to
        // the caller and clearing the field locally. Nothing is persisted,
        // and no reply is appended to the tree here, that belongs to the
        // page and there is nothing on the server to reconcile it against.
        onReply?.(trimmed);
        setBody('');
    }

    return (
        <form
            onSubmit={handleSubmit}
            className={cn('flex items-start gap-3', className)}
        >
            <AnonAvatar seed={String(threadNo)} className="mt-1" />

            <div className="flex flex-1 flex-col gap-2">
                <FormField label="Reply to this thread">
                    <Textarea
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
                        {body.length}/{POST_MAX_LENGTH}
                    </MachineValue>
                    {overLimit ? (
                        <span className="text-caption font-medium">
                            Over the limit
                        </span>
                    ) : null}
                </div>

                <div className="flex items-center justify-between gap-3">
                    <p id={hintId} className="text-meta text-faint">
                        Start a line with &gt; for greentext, or &gt;&gt;
                        followed by a number to reference a post.
                    </p>

                    <Button type="submit" disabled={!canSubmit}>
                        Post reply
                    </Button>
                </div>
            </div>
        </form>
    );
}
