import type { ReactNode } from 'react';
import { AppHeader } from '@/components/clover/app-header';
import { AppSidebar } from '@/components/clover/app-sidebar';
import { MobileNav } from '@/components/clover/mobile-nav';

/**
 * The Clover app shell: a sticky sidebar on the left at `md` and up, a sticky
 * header across the content column, and a fixed bottom bar in place of the
 * sidebar on small screens.
 *
 * There is no drawer. The design has no hamburger, and the bottom bar is the
 * whole of small-screen navigation, so content reserves room for it rather
 * than sliding under it.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
    return (
        <div className="bg-bg flex min-h-dvh">
            <AppSidebar />

            <div className="flex min-w-0 flex-1 flex-col">
                <AppHeader />

                <main className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
                    {children}
                </main>
            </div>

            <MobileNav />
        </div>
    );
}
