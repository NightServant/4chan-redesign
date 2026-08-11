import { SendIcon, TriangleAlert } from 'lucide-react';
import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { FormField } from '@/components/clover/form-field';
import { MachineValue } from '@/components/clover/machine-value';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { POST_MAX_LENGTH } from '@/lib/posting';
import { cn } from '@/lib/utils';

export interface MessageComposerProps {
    /** The correspondent. Names the field, so it is never ambiguous who a
     *  half-written message is addressed to when two panes are open. */
    handle: string;
    onSend: (body: string) => void;
    className?: string;
}

/**
 * The composer at the foot of an open conversation.
 *
 * Shares `POST_MAX_LENGTH` with the reply composer and the new-thread dialog
 * rather than declaring a limit of its own: three constants with the same
 * value drift the first time the product changes its mind about one.
 */
export function MessageComposer({
    handle,
    onSend,
    className,
}: MessageComposerProps) {
    const [body, setBody] = useState('');
    const counterId = `${useId()}-counter`;

    const trimmed = body.trim();
    const overLimit = body.length > POST_MAX_LENGTH;
    const canSend = trimmed.length > 0 && !overLimit;

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!canSend) {
            return;
        }

        // There is no backend: sending hands the body to the caller, which
        // appends it to local state. Nothing is requested and nothing is
        // persisted, so no failure path is simulated either.
        onSend(trimmed);
        setBody('');
    }

    return (
        <form
            onSubmit={handleSubmit}
            className={cn(
                'flex flex-col gap-2 border-t border-border p-4',
                className,
            )}
        >
            <FormField label={`Message ${handle}`}>
                <Textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    placeholder="Write a message"
                    aria-describedby={counterId}
                    rows={2}
                    className="min-h-16"
                />
            </FormField>

            <div className="flex items-center justify-between gap-3">
                <span
                    id={counterId}
                    className={cn(
                        'flex items-center gap-1',
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
                </span>

                <Button type="submit" disabled={!canSend}>
                    <SendIcon aria-hidden="true" />
                    Send
                </Button>
            </div>
        </form>
    );
}
