import { Head } from '@inertiajs/react';
import { BoardGrid } from '@/components/home/board-grid';
import { Features } from '@/components/home/features';
import { Hero } from '@/components/home/hero';
import { HowItWorks } from '@/components/home/how-it-works';
import { SiteFooter } from '@/components/home/site-footer';
import { TopNav } from '@/components/home/top-nav';
import { Trending } from '@/components/home/trending';
import type { Board, Thread, TrendingTag } from '@/types/clover';

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
 *
 * Everything on it is ingested data the server chose. Because it is public,
 * the server sends only what a visitor with no content preference may see, so
 * nothing here filters: a homepage that received boards it then hid would be
 * a homepage that had already been sent them.
 */

/**
 * How the one `threads` prop is divided between the two bands that show
 * threads. The split lives here rather than inside either band so that no
 * thread can appear twice on the page — the hero preview and the trending
 * strip would otherwise both reach for the top of the same list.
 */
const HERO_PREVIEW_COUNT = 2;
const TRENDING_COUNT = 3;

interface WelcomeProps {
    boards: Board[];
    threads: Thread[];
    trending: TrendingTag[];
}

export default function Welcome({ boards, threads, trending }: WelcomeProps) {
    return (
        <div className="flex min-h-dvh flex-col bg-bg">
            <Head title="Anonymous discussion, organised by board" />

            <TopNav />

            <main className="flex-1">
                <Hero threads={threads.slice(0, HERO_PREVIEW_COUNT)} />
                <BoardGrid boards={boards} />
                <Trending
                    threads={threads.slice(
                        HERO_PREVIEW_COUNT,
                        HERO_PREVIEW_COUNT + TRENDING_COUNT,
                    )}
                    trending={trending}
                />
                <Features />
                <HowItWorks />
            </main>

            <SiteFooter />
        </div>
    );
}
