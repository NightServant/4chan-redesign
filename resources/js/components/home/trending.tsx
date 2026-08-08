import { Link } from '@inertiajs/react';
import { ThreadCard } from '@/components/clover/thread-card';
import { Section } from '@/components/home/section';
import { Button } from '@/components/ui/button';
import { THREADS } from '@/fixtures/clover';
import { popular } from '@/routes';

/**
 * A short strip of what is currently being bumped.
 *
 * Thread routes do not exist yet, so every card is pointed at `popular()`
 * rather than its own thread, which would 404 a first-time visitor. The
 * grid runs at a lower density than the boards band above it (wider cards,
 * bigger gap) so the two bands do not read as the same grid twice.
 */
function Trending() {
    return (
        <Section
            id="trending"
            label="Trending discussions"
            title="What is being bumped today"
            action={
                <Button asChild variant="outline">
                    <Link href={popular.url()}>Open the feed</Link>
                </Button>
            }
        >
            <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-3.5">
                {THREADS.slice(1, 4).map((thread) => (
                    <ThreadCard
                        key={thread.no}
                        thread={thread}
                        href={popular.url()}
                    />
                ))}
            </div>
        </Section>
    );
}

export { Trending };
