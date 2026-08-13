import type { ReactNode } from 'react';
import { AppHeader } from '@/components/clover/app-header';
import { AppSidebar } from '@/components/clover/app-sidebar';
import { MobileNav } from '@/components/clover/mobile-nav';
import { PatternField } from '@/components/clover/pattern-field';

/**
 * The Clover app shell: a sticky sidebar on the left at `md` and up, a sticky
 * header across the content column, and a fixed bottom bar in place of the
 * sidebar on small screens.
 *
 * There is no drawer. The design has no hamburger, and the bottom bar is the
 * whole of small-screen navigation, so content reserves room for it rather
 * than sliding under it.
 *
 * The content column is drawn on the same patterned paper as the homepage, so
 * a reader who signs in does not arrive somewhere that looks like a different
 * product. Shallower travel than the homepage's bands: an app screen is read,
 * not scrolled past, and paper that moves much under a thread is a distraction
 * rather than depth.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-dvh bg-bg">
            <AppSidebar />

            <div className="flex min-w-0 flex-1 flex-col">
                <AppHeader />

                <main className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
                    <PatternField depth={28} feather={false} className="h-full">
                        {children}
                    </PatternField>
                </main>
            </div>

            <MobileNav />
        </div>
    );
}
