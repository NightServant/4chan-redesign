import type { Auth } from '@/types/auth';
import type { ActivityEntry, Board, ThreadNotification } from '@/types/clover';

declare module 'react' {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            sidebarOpen: boolean;
            /**
             * Whether this anon opted into boards 4chan marks as not
             * worksafe. Always a boolean, never undefined: `/communities` is
             * public, and a page that has to special-case "nobody is signed
             * in" to decide what it may show will eventually get it wrong.
             */
            showsMatureBoards: boolean;
            /**
             * This anon's own recent activity. Empty when signed out, which
             * is true rather than a fallback.
             */
            /** Origin for absolute URLs in `PageMeta`. No trailing slash. */
            appUrl: string;
            recentActivity: ActivityEntry[];
            /** New replies in threads this anon is in. See `ThreadNotifications`. */
            threadNotifications: ThreadNotification[];
            /**
             * The sidebar's board list. Shared because the sidebar is app
             * chrome and renders on every screen; filtered by the same
             * visibility rule as every other surface that names a board.
             */
            sidebarBoards: Board[];
            sidebarTrending: Board[];
            [key: string]: unknown;
        };
    }
}
