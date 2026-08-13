import type { PropsWithChildren } from 'react';
import { PageHeader } from '@/components/clover/page-header';

/**
 * The shell every `settings/*` page renders inside. `app.tsx` stacks it under
 * `AppLayout`, so this file draws only the settings chrome: the page heading
 * and the column the page itself lands in.
 *
 * The h1 lives here rather than on the page. One heading for a screen whose
 * sections are all "Settings" is the honest outline, and it is the reason the
 * page underneath renders no heading of its own.
 *
 * ## The section nav went with the second page
 *
 * There were two settings screens, Profile and Security, and a nav down the
 * left to move between them. Merging them left that nav pointing at one
 * destination, which is not navigation — it is a list with a single item that
 * is always the current one, taking a 224px column of every settings screen to
 * say so.
 *
 * What replaced it is the page's own panels: each is a named region, so a
 * screen reader lands on "Password" or "Passkeys" directly rather than through
 * a nav that has to be read first.
 */
export default function SettingsLayout({ children }: PropsWithChildren) {
    return (
        <div className="flex flex-col gap-8 px-4 py-6 lg:px-6">
            <PageHeader
                title="Settings"
                description="Your account and its security."
            />

            <div className="flex min-w-0 flex-col gap-6 lg:max-w-2xl">
                {children}
            </div>
        </div>
    );
}
