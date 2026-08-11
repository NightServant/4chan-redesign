import { MailIcon } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/clover/empty-state';
import { PageHeader } from '@/components/clover/page-header';
import { ConversationList } from '@/components/messages/conversation-list';
import { MessageThread } from '@/components/messages/message-thread';
import { Card } from '@/components/ui/card';
import { cn, plural } from '@/lib/utils';
import type { Conversation, Message } from '@/types/clover';

/** Messages written in this session, keyed by conversation. */
type SentMessages = Record<number, Message[]>;

function countUnread(conversations: readonly Conversation[]): number {
    return conversations.reduce(
        (total, conversation) => total + conversation.unread,
        0,
    );
}

export interface MessageInboxProps {
    conversations: readonly Conversation[];
}

/**
 * The inbox: conversation list beside the open conversation.
 *
 * Below `md` only one pane fits, so the panes take turns: the list until a
 * conversation is chosen, then the conversation with a back control. Which
 * pane shows is local state rather than a media query in JavaScript, because
 * a resize should not throw away the anon's place.
 *
 * Unread counts are left alone when a conversation is opened. There is no
 * backend to record a read receipt against, so clearing them here would
 * invent state that vanishes on reload, and would blank the one unread badge
 * in the fixture the moment the page mounts.
 */
export function MessageInbox({ conversations }: MessageInboxProps) {
    const [selectedId, setSelectedId] = useState<number | null>(
        conversations[0]?.id ?? null,
    );
    const [showThreadOnMobile, setShowThreadOnMobile] = useState(false);
    const [sent, setSent] = useState<SentMessages>({});

    const selected = conversations.find(
        (conversation) => conversation.id === selectedId,
    );

    function handleSelect(id: number) {
        setSelectedId(id);
        setShowThreadOnMobile(true);
    }

    /**
     * There is no backend. A sent message is appended to local state, keyed
     * by conversation so it stays with the anon it was written to, and is
     * gone on the next reload.
     */
    function handleSend(body: string) {
        if (selectedId === null) {
            return;
        }

        setSent((current) => {
            const existing = current[selectedId] ?? [];

            return {
                ...current,
                [selectedId]: [
                    ...existing,
                    {
                        id: Date.now(),
                        outgoing: true,
                        body,
                        time: 'Just now',
                    },
                ],
            };
        });
    }

    if (conversations.length === 0) {
        return (
            <>
                <PageHeader title="Messages" />
                <EmptyState
                    icon={<MailIcon />}
                    title="No messages"
                    body="Anons can message you about a thread you posted in. Nothing arrives unprompted."
                />
            </>
        );
    }

    const open = selected
        ? {
              ...selected,
              messages: [...selected.messages, ...(sent[selected.id] ?? [])],
          }
        : null;

    return (
        <>
            <PageHeader
                title="Messages"
                description={`${plural(conversations.length, 'conversation')} · ${countUnread(conversations)} unread`}
            />

            <Card className="h-[70dvh] flex-row gap-0 overflow-hidden py-0 md:h-[640px]">
                <ConversationList
                    conversations={conversations}
                    selectedId={selectedId}
                    onSelect={handleSelect}
                    className={cn(
                        'w-full shrink-0 overflow-y-auto md:flex md:w-[320px] md:border-r md:border-border',
                        showThreadOnMobile ? 'hidden' : 'flex',
                    )}
                />

                {open ? (
                    <MessageThread
                        conversation={open}
                        onSend={handleSend}
                        onBack={() => setShowThreadOnMobile(false)}
                        className={cn(
                            'md:flex',
                            showThreadOnMobile ? 'flex' : 'hidden',
                        )}
                    />
                ) : null}
            </Card>
        </>
    );
}
