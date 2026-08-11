import { AnonAvatar } from '@/components/clover/anon-avatar';
import { MachineValue } from '@/components/clover/machine-value';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/types/clover';

export interface ConversationListProps {
    conversations: readonly Conversation[];
    /** The open conversation, or null before one has been chosen. */
    selectedId: number | null;
    onSelect: (id: number) => void;
    className?: string;
}

/**
 * The left pane of the inbox: one row per correspondent.
 *
 * Rows are buttons rather than links. Selecting a conversation changes what
 * the right pane shows and nothing else, so there is no URL for a link to
 * point at, and a link that only runs an onClick is a link that breaks the
 * back button and middle-click.
 *
 * Unread is carried in the row's accessible name as well as in the badge.
 * A count rendered only as a green pill is a count a screen reader never
 * hears, and colour is never the only channel Clover signals state on.
 */
export function ConversationList({
    conversations,
    selectedId,
    onSelect,
    className,
}: ConversationListProps) {
    return (
        <ul
            aria-label="Conversations"
            data-slot="conversation-list"
            className={cn('flex flex-col', className)}
        >
            {conversations.map((conversation) => {
                const selected = conversation.id === selectedId;
                const lastMessage =
                    conversation.messages[conversation.messages.length - 1];

                return (
                    <li key={conversation.id}>
                        <button
                            type="button"
                            aria-current={selected ? 'true' : undefined}
                            aria-label={
                                conversation.unread > 0
                                    ? `${conversation.handle}, ${conversation.unread} unread`
                                    : conversation.handle
                            }
                            onClick={() => onSelect(conversation.id)}
                            className={cn(
                                'flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left',
                                'transition-colors duration-[var(--duration-hover)] ease-standard',
                                'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                                selected
                                    ? 'bg-primary-soft text-primary'
                                    : 'hover:bg-surface-hover',
                            )}
                        >
                            <AnonAvatar
                                seed={conversation.handle}
                                size={36}
                                className="mt-0.5"
                            />

                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <span className="flex items-center gap-2">
                                    <span className="min-w-0 flex-1 truncate text-body-sm font-medium">
                                        {conversation.handle}
                                    </span>
                                    <MachineValue>
                                        {conversation.time}
                                    </MachineValue>
                                </span>

                                <span className="flex items-center gap-2">
                                    <span className="min-w-0 flex-1 truncate text-meta text-muted-foreground">
                                        {lastMessage?.body}
                                    </span>
                                    {conversation.unread > 0 ? (
                                        <Badge tone="primary">
                                            {conversation.unread}
                                        </Badge>
                                    ) : null}
                                </span>
                            </span>
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}
