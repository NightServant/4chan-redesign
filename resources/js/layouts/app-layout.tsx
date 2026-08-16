import { router } from '@inertiajs/react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { AppHeader } from '@/components/clover/app-header';
import { AppSidebar } from '@/components/clover/app-sidebar';
import { MobileNav } from '@/components/clover/mobile-nav';
import { PatternField } from '@/components/clover/pattern-field';
import { Sheet, SheetOverlay, SheetPortal } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

/**
 * The Clover app shell: a sticky sidebar on the left at `lg` and up, a sticky
 * header across the content column, and a fixed bottom bar in place of the
 * sidebar on small screens.
 *
 * Below `lg` the sidebar is a drawer instead, opened from a hamburger in
 * `AppHeader` and built from the same `AppSidebar` component, so it never
 * drifts from what the persistent rail shows. This reverses an earlier
 * decision that there was no drawer and the bottom bar was the whole of
 * small-screen navigation: that held while the rail was visible from `md`,
 * but a persistent 268px sidebar between `md` and `lg` left an 805px tablet
 * with a 489px feed column, which is the defect the drawer exists to fix.
 * The bottom bar still covers ordinary small-screen navigation; the drawer is
 * what reaches the board lists and footer links that only ever lived in the
 * sidebar.
 *
 * `Sheet` is controlled here rather than left uncontrolled, so navigating
 * away can close the drawer programmatically: Inertia's `router.on`
 * `navigate` event fires once a visit lands, which an outside click or
 * Escape would not, and this layout persists across visits rather than
 * remounting for each one.
 *
 * The content column is drawn on the same patterned paper as the homepage, so
 * a reader who signs in does not arrive somewhere that looks like a different
 * product. Shallower travel than the homepage's bands: an app screen is read,
 * not scrolled past, and paper that moves much under a thread is a distraction
 * rather than depth.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
    const [sidebarDrawerOpen, setSidebarDrawerOpen] = useState(false);

    useEffect(() => {
        return router.on('navigate', () => setSidebarDrawerOpen(false));
    }, []);

    return (
        <Sheet open={sidebarDrawerOpen} onOpenChange={setSidebarDrawerOpen}>
            <div className="flex min-h-dvh bg-bg">
                <AppSidebar />

                <div className="flex min-w-0 flex-1 flex-col">
                    <AppHeader />

                    <main className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
                        <PatternField
                            depth={28}
                            feather={false}
                            className="h-full"
                        >
                            {children}
                        </PatternField>
                    </main>
                </div>

                <MobileNav />
            </div>

            {/* The drawer's panel. It renders `AppSidebar` itself rather than
                a second, mobile-shaped nav, so the two can never show
                different rows. The `static block h-full` override undoes the
                rail-only positioning (`sticky`/`hidden`/`h-screen`) that
                component carries for its `lg`-and-up placement: here the
                `Sheet`'s own fixed positioning already does that job, and
                without the override the aside would render `hidden` at every
                width, since only `lg:block` turns it back on. `lg:hidden` on
                both layers is defensive: the trigger that opens this is
                already hidden at `lg`, but a window resized while the drawer
                is open should not leave it showing over the rail. */}
            <SheetPortal>
                <SheetOverlay className="lg:hidden" />
                <SheetPrimitive.Content
                    aria-label="Sidebar navigation"
                    className={cn(
                        'fixed inset-y-0 left-0 z-50 h-full lg:hidden',
                        'data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=closed]:slide-out-to-left',
                        'data-[state=open]:animate-in data-[state=open]:duration-500 data-[state=open]:slide-in-from-left',
                    )}
                >
                    <AppSidebar className="static block h-full" />
                </SheetPrimitive.Content>
            </SheetPortal>
        </Sheet>
    );
}
