import { ArrowLeftIcon } from 'lucide-react';
import { AnonAvatar } from '@/components/clover/anon-avatar';
import { MachineValue } from '@/components/clover/machine-value';
import { MessageComposer } from '@/components/messages/message-composer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/types/clover';

export interface MessageThreadProps {
    conversation: Conversation;
    onSend: (body: string) => void;
    /** Returns to the list on small screens, where only one pane fits. */
    onBack?: () => void;
    className?: string;
}

/**
 * The right pane: one conversation, oldest first, with its composer.
 *
 * Direction is drawn with alignment and fill, neither of which a screen
 * reader can see, so every message also names its sender in text that is
 * visually hidden. The scroll region is named and focusable because a region
 * that scrolls but cannot be reached by Tab is unreadable without a mouse.
 */
export function MessageThread({
    conversation,
    onSend,
    onBack,
    className,
}: MessageThreadProps) {
    return (
        <div
            data-slot="message-thread"
            className={cn('flex min-h-0 min-w-0 flex-1 flex-col', className)}
        >
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                {onBack ? (
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Back to conversations"
                        onClick={onBack}
                        className="md:hidden"
                    >
                        <ArrowLeftIcon aria-hidden="true" />
                    </Button>
                ) : null}

                <AnonAvatar seed={conversation.handle} size={36} />

                <div className="flex min-w-0 flex-col gap-0.5">
                    <h2 className="truncate font-display text-h3 font-semibold text-foreground">
                        {conversation.handle}
                    </h2>
                    <MachineValue>
                        {conversation.messages.length} messages &middot;{' '}
                        {conversation.time}
                    </MachineValue>
                </div>
            </div>

            <div
                role="region"
                aria-label={`Conversation with ${conversation.handle}`}
                tabIndex={0}
                className="min-h-0 flex-1 overflow-y-auto px-4 py-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
                <ul aria-label="Messages" className="flex flex-col gap-3">
                    {conversation.messages.map((message) => (
                        <li
                            key={message.id}
                            className={cn(
                                'flex flex-col gap-1',
                                message.outgoing ? 'items-end' : 'items-start',
                            )}
                        >
                            <span className="sr-only">
                                {message.outgoing ? 'You' : conversation.handle}
                            </span>

                            <p
                                className={cn(
                                    'max-w-[75%] rounded-xl px-3.5 py-2.5 text-body-sm text-pretty text-foreground',
                                    message.outgoing
                                        ? 'bg-primary-soft'
                                        : 'bg-surface-elevated',
                                )}
                            >
                                {message.body}
                            </p>

                            <MachineValue>{message.time}</MachineValue>
                        </li>
                    ))}
                </ul>
            </div>

            <MessageComposer
                handle={conversation.handle}
                onSend={onSend}
                className="mt-auto"
            />
        </div>
    );
}
