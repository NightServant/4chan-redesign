import { Link } from '@inertiajs/react';
import {
    CircleAlert,
    Clock,
    FileQuestion,
    Lock,
    ServerCrash,
    Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/clover/empty-state';
import { MachineValue } from '@/components/clover/machine-value';
import { PageMeta } from '@/components/clover/page-meta';
import { Button } from '@/components/ui/button';
import { home } from '@/routes';

type ErrorCopy = {
    icon: LucideIcon;
    title: string;
    body: string;
    /** `home` links back to the feed, `reload` retries, `none` offers nothing. */
    action: 'home' | 'reload' | 'none';
};

/**
 * Copy per status. Dry and specific: an anon who hit a 403 wants to know
 * whether the page exists, and an anon who hit a 500 wants to know whether
 * it was their fault. Neither wants an apology.
 */
const COPY: Record<number, ErrorCopy> = {
    403: {
        icon: Lock,
        title: 'Not yours to see',
        body: 'This page exists. Your account cannot open it.',
        action: 'home',
    },
    404: {
        icon: FileQuestion,
        title: 'No such page',
        body: 'The URL does not match a board, a thread, or anything else here. Check the slug.',
        action: 'home',
    },
    419: {
        icon: Clock,
        title: 'The page expired',
        body: 'You had this open long enough that the session token went stale. Load it again.',
        action: 'reload',
    },
    500: {
        icon: ServerCrash,
        title: 'Something broke',
        body: 'The server failed on this request. It has been logged. Nothing you did caused it.',
        action: 'none',
    },
    503: {
        icon: Wrench,
        title: 'Down for maintenance',
        body: 'Clover is being worked on. It will be back without you doing anything.',
        action: 'none',
    },
};

/**
 * `status` is a `number`, not a union, so a status with no copy of its own
 * can reach this page. It renders this rather than a blank screen, and the
 * number above it still tells an anon what to report.
 */
const FALLBACK: ErrorCopy = {
    icon: CircleAlert,
    title: 'Unexpected response',
    body: 'The server answered with a status this screen has no copy for. Quote the number above if it keeps happening.',
    action: 'home',
};

function actionFor(action: ErrorCopy['action']): ReactNode {
    if (action === 'home') {
        return (
            <Button asChild>
                <Link href={home()}>Back to the feed</Link>
            </Button>
        );
    }

    if (action === 'reload') {
        /* A stale session token is fixed by fetching the page again, which is
           a document reload rather than an Inertia visit: the token lives in
           the HTML shell, not in the page props. */
        return (
            <Button onClick={() => window.location.reload()}>Try again</Button>
        );
    }

    return null;
}

/**
 * The HTTP error screen, rendered inside the app chrome on purpose. A 404 is
 * a navigational dead end, and leaving the sidebar in place lets an anon
 * carry on from it instead of reaching for the back button.
 */
export default function ErrorPage({ status }: { status: number }) {
    const copy = COPY[status] ?? FALLBACK;
    const Icon = copy.icon;

    return (
        <>
            <PageMeta title={copy.title} description={copy.body} />

            <div className="mx-auto flex w-full max-w-[720px] flex-col items-center gap-1 px-6 py-16">
                {/* The status number doubles as the screen's only h1: it is
                    the one thing an anon reporting the problem has to quote. */}
                <h1>
                    <MachineValue className="font-display text-display font-semibold text-foreground">
                        {status}
                    </MachineValue>
                </h1>

                <EmptyState
                    icon={<Icon />}
                    title={copy.title}
                    body={copy.body}
                    action={actionFor(copy.action)}
                    className="py-6"
                />
            </div>
        </>
    );
}
