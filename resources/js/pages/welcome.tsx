import { Head } from '@inertiajs/react';
import { BoardCarousel } from '@/components/home/board-carousel';
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
 * They are drawn on visible paper, and the paper alternates: hero ruled,
 * boards dotted, trending ruled, features dotted, how-it-works ruled. Each
 * band's layer drifts at its own rate as it passes, so the page reads as
 * stacked transparencies over a technical drawing rather than as one flat
 * image with a texture on it. The pattern belongs to `Section`, and the depth
 * values live with each band; this comment is the only place the whole
 * sequence is visible at once.
 *
 * Everything on it is ingested data the server chose. Because it is public,
 * the server sends only what a visitor with no content preference may see, so
 * nothing here filters: a homepage that received boards it then hid would be
 * a homepage that had already been sent them.
 */

/**
 * How the one `threads` prop is divided between the two bands that show
 * threads. The split lives here rather than inside either band so that no
 * thread can appear twice on the page: the hero rails and the trending strip
 * would otherwise both reach for the top of the same list.
 *
 * The trending strip is served first, and the hero takes what is left.
 * That order matters when the database is nearly empty: the strip shows the
 * three most recently bumped threads and needs them specifically, whereas the
 * rails are ambient texture that reads fine with however many remain, or with
 * none at all.
 */
const TRENDING_COUNT = 3;
const HERO_RAIL_COUNT = 16;

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
                <Hero
                    threads={threads.slice(
                        TRENDING_COUNT,
                        TRENDING_COUNT + HERO_RAIL_COUNT,
                    )}
                />
                <BoardCarousel boards={boards} />
                <Trending
                    threads={threads.slice(0, TRENDING_COUNT)}
                    trending={trending}
                />
                <Features />
                <HowItWorks />
            </main>

            <SiteFooter />
        </div>
    );
}
