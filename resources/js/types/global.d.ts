import type { Auth } from '@/types/auth';

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
            [key: string]: unknown;
        };
    }
}
