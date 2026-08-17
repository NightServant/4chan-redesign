import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { AuthGate } from '@/components/clover/auth-gate';
import { subscribe as subscribeToBoard } from '@/routes/boards';
import type { Board } from '@/types/clover';

/**
 * Following a board, wherever a Join control renders.
 *
 * ## Why this is a hook and not another copy
 *
 * `BoardSubscriptionController` and the `board_subscriptions` table have
 * existed since task 18, and `BoardResource` sends `subscribed` to every
 * surface that draws a board. The board page's control did not read either of
 * them: it was `useState(false)`, so it reported `aria-pressed` for something
 * nothing recorded and forgot itself on reload. That is the same class of
 * defect as the bookmark buttons — a control that looks identical to a working
 * one and does nothing — and `use-bookmark.tsx` is where the answer to it
 * lives, so this follows its shape rather than inventing a second one.
 *
 * ## The gate comes with it
 *
 * The subscribe routes sit behind `auth`. A signed-out anon pressing Join
 * without a gate is therefore redirected to the login form off a page that is
 * open to read, which is precisely what `AuthGate` exists to prevent. The gate
 * is returned as an element so a caller cannot take the toggle and forget the
 * dialog.
 */
type BoardSubscription = Pick<Board, 'id' | 'subscribed'>;

type UseBoardSubscription = {
    /** Follows or unfollows the board, or opens the gate when signed out. */
    toggleSubscription: (board: BoardSubscription) => void;
    /** Render this once, anywhere in the surface that drew the control. */
    authGate: ReactNode;
};

export function useBoardSubscription(): UseBoardSubscription {
    const { auth } = usePage().props;
    const [gated, setGated] = useState(false);

    function toggleSubscription(board: BoardSubscription): void {
        if (!auth.user) {
            setGated(true);

            return;
        }

        const url = subscribeToBoard(board.id).url;

        /* The press happens above the thread list and the reply is a redirect
           back: without this the page returns to the top and the board an anon
           just joined is somewhere above them. */
        const options = { preserveScroll: true };

        /**
         * Called on the router, never picked off it. Detaching the method
         * (`const request = cond ? router.delete : router.post`) leaves `this`
         * undefined inside and Inertia throws before a request is made — the
         * bug that left every bookmark button in this app dead. `post` takes
         * `(url, data, options)`, so the empty body is not decoration either:
         * `post(url, options)` puts `preserveScroll` in the request body.
         */
        if (board.subscribed) {
            router.delete(url, options);

            return;
        }

        router.post(url, {}, options);
    }

    return {
        toggleSubscription,
        authGate: (
            <AuthGate
                action="follow a board"
                open={gated}
                onOpenChange={setGated}
            />
        ),
    };
}
