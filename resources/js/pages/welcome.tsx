import { Head } from '@inertiajs/react';
import { BoardGrid } from '@/components/home/board-grid';
import { Features } from '@/components/home/features';
import { Hero } from '@/components/home/hero';
import { HowItWorks } from '@/components/home/how-it-works';
import { SiteFooter } from '@/components/home/site-footer';
import { TopNav } from '@/components/home/top-nav';
import { Trending } from '@/components/home/trending';

/**
 * Clover's homepage.
 *
 * Public, and the only screen that runs its own chrome rather than the app
 * shell: a visitor here has not chosen a board yet, so a sidebar of
 * destinations they cannot use would be noise. `app.tsx` maps this page to a
 * null layout for that reason.
 *
 * Bands are separated by hairlines rather than alternating filled backgrounds,
 * which is what keeps the page reading as one document instead of a stack of
 * unrelated slabs.
 */
export default function Welcome() {
    return (
        <div className="bg-bg flex min-h-dvh flex-col">
            <Head title="Anonymous discussion, organised by board" />

            <TopNav />

            <main className="flex-1">
                <Hero />
                <BoardGrid />
                <Trending />
                <Features />
                <HowItWorks />
            </main>

            <SiteFooter />
        </div>
    );
}
