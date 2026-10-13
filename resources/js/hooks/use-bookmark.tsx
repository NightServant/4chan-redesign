import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { AuthGate } from '@/components/clover/auth-gate';
import { bookmark as bookmarkThread } from '@/routes/threads';
import type { Thread } from '@/types/clover';

/**
 * Saving and unsaving a thread, wherever a `ThreadCard` renders.
 *
 * ## Why this is a hook and not five copies
 *
 * `ThreadCard` draws a bookmark button unconditionally and calls whatever
 * `onBookmark` it was handed. Three of the six screens that render one handed
 * it nothing: the board, search, and the account screen's own Saved tab. The
 * button was there, it looked identical to the working ones, and pressing it
 * did nothing at all — which also explains the other half of the complaint,
 * that saved threads were not appearing. Nothing had been saved.
 *
 * The feed, history and bookmarks screens each had their own copy of this
 * function, so the fix for the other three was to write it a fourth, fifth and
 * sixth time and hope the seventh screen remembers. It lives here instead.
 *
 * ## The gate comes with it
 *
 * A signed-out anon pressing save must meet `AuthGate`, never a redirect to
 * the login form — reading is open, and being bounced out of a page for
 * reaching at a control is not how that reads. The gate is returned as an
 * element so a caller cannot take the toggle and forget the dialog; a page
 * that renders `authGate` gets both or neither.
 */
type BookmarkOptions = {
    /**
     * The page is a scrolling list (`PagedList`): keep what has loaded.
     *
     * The save is answered with a redirect back, and the redirected GET is a
     * full visit, so every prop is re-sent from page one -- the pages the
     * reader had scrolled through are replaced by the first, the scroll
     * position lands somewhere else, and the card they pressed may no longer
     * be on screen at all. With this on, the request asks for `auth` alone, so
     * the follow-up never touches the list, and the card is flipped in place
     * the moment it is pressed (rolled back by Inertia if the save fails).
     *
     * Off for the screens that are not paged. The Saved tab wants the full
     * visit: unsaving there is meant to drop the row, and the server's answer
     * is what drops it.
     */
    keepsPages?: boolean;
};

type UseBookmark = {
    /** Toggles the thread's saved state, or opens the gate when signed out. */
    toggleBookmark: (thread: Thread) => void;
    /** Render this once, anywhere in the page. */
    authGate: ReactNode;
};

/**
 * `value` with every thread `id` shows as `bookmarked`, in whatever list or
 * wrapper it sits. Unchanged branches keep their identity, so Inertia sees
 * only the props that actually moved.
 */
function withBookmarked(
    value: unknown,
    id: number,
    bookmarked: boolean,
): unknown {
    if (Array.isArray(value)) {
        const next = value.map((item) => withBookmarked(item, id, bookmarked));

        return next.some((item, index) => item !== value[index]) ? next : value;
    }

    if (value === null || typeof value !== 'object') {
        return value;
    }

    const record = value as Record<string, unknown>;

    if (record.id === id && typeof record.bookmarked === 'boolean') {
        return record.bookmarked === bookmarked
            ? value
            : { ...record, bookmarked };
    }

    const next = Object.fromEntries(
        Object.entries(record).map(([key, child]) => [
            key,
            withBookmarked(child, id, bookmarked),
        ]),
    );

    return Object.keys(next).some((key) => next[key] !== record[key])
        ? next
        : value;
}

export function useBookmark({
    keepsPages = false,
}: BookmarkOptions = {}): UseBookmark {
    const { auth } = usePage().props;
    const [gated, setGated] = useState(false);

    function toggleBookmark(thread: Thread): void {
        if (!auth.user) {
            setGated(true);

            return;
        }

        const url = bookmarkThread(thread.id).url;

        /* `preserveScroll` because the press happens mid-list and the reply is
           a redirect back: without it the page returns to the top and the row
           an anon just saved is somewhere above them.

           `onError` because without it a refusal is invisible. The request
           went out with nothing but `preserveScroll`, and no screen rendering
           a bookmark reads `errors` -- so a save the server rejected, whether
           for a throttle, a session that expired in another tab, or a board
           the account has since opted out of, left the icon exactly as it was
           and said nothing. That is indistinguishable from a dead button, and
           this control has already been a dead button once. */
        const options = {
            preserveScroll: true,
            preserveState: true,
            ...(keepsPages ? { only: ['auth'] } : {}),
            onError: () =>
                toast.error('That did not save. Try again in a moment.'),
        };

        /* The optimistic callback is handed the page's props and returns the
           ones it changes; Inertia puts the old ones back if the save fails.
           `router.optimistic()` returns the router, so the call below is still
           made on it and not picked off it. */
        const pending = keepsPages
            ? router.optimistic((props: Record<string, unknown>) => {
                  const changed: Record<string, unknown> = {};

                  for (const [key, value] of Object.entries(props)) {
                      const next = withBookmarked(
                          value,
                          thread.id,
                          !thread.bookmarked,
                      );

                      if (next !== value) {
                          changed[key] = next;
                      }
                  }

                  return changed;
              })
            : router;

        /**
         * Called on the router, never picked off it.
         *
         * This was `const request = thread.bookmarked ? router.delete :
         * router.post`, which detaches the method from its object: `this` is
         * undefined inside, and Inertia throws `Cannot read properties of
         * undefined (reading 'visit')` before a request is ever made. Every
         * page carried that line, so the bookmark button had never once worked
         * for a signed-in anon on any screen.
         *
         * `post` takes `(url, data, options)`, so the empty body is not
         * decoration: `post(url, options)` puts `preserveScroll` in the request
         * body, where it is ignored, and the page jumps to the top.
         */
        if (thread.bookmarked) {
            pending.delete(url, options);

            return;
        }

        pending.post(url, {}, options);
    }

    return {
        toggleBookmark,
        authGate: (
            <AuthGate
                action="save a thread"
                open={gated}
                onOpenChange={setGated}
            />
        ),
    };
}
