import { Head } from '@inertiajs/react';
import { MessageInbox } from '@/components/messages/inbox';
import { CONVERSATIONS } from '@/fixtures/clover';

/**
 * Direct messages.
 *
 * The design project has no screen for this one, so the layout is built from
 * the same pieces every other Clover page uses rather than invented: the page
 * header, a card holding the two panes, and machine values for every count
 * and timestamp.
 */
export default function Messages() {
    return (
        <>
            <Head title="Messages" />

            <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6 px-6 py-8">
                <MessageInbox conversations={CONVERSATIONS} />
            </div>
        </>
    );
}
