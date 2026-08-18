import { SectionLabel } from '@/components/clover/section-label';
import { ThreadCard } from '@/components/clover/thread-card';
import type { HistoryEntry, Thread } from '@/types/clover';

/** The order the design groups a history by, oldest bucket last. */
const GROUPS = ['Today', 'Yesterday', 'Earlier'] as const;

/**
 * Threads grouped by the day they were read, each drawn with the feed's own
 * `ThreadCard`.
 *
 * Extracted out of `history.tsx`, which used to be the only caller. The
 * account screen's History tab needs the same list below `md` — the same
 * entries shape, the same day grouping, the same card — and a second copy of
 * this block is exactly the defect this codebase keeps finding and rewriting
 * away from: the history screen once drew its own row, built from a title, a
 * board and a post number flattened by hand, and it looked nothing like the
 * threads it was a history of.
 *
 * Empty state, search and pagination stay with the callers: `history.tsx`
 * has all three, the account tab has none, and neither behaviour belongs to
 * "how a list of visited threads is grouped and drawn."
 */
type HistoryEntryListProps = {
    /** Already filtered and paginated by the caller; this only groups it. */
    entries: HistoryEntry[];
    onBookmark: (thread: Thread) => void;
};

export function HistoryEntryList({
    entries,
    onBookmark,
}: HistoryEntryListProps) {
    return (
        <div className="flex flex-col gap-5">
            {GROUPS.map((group) => {
                const inGroup = entries.filter((entry) => entry.day === group);

                if (inGroup.length === 0) {
                    return null;
                }

                return (
                    <section
                        key={group}
                        aria-label={group}
                        className="flex flex-col gap-2.5"
                    >
                        <SectionLabel>{group}</SectionLabel>

                        <div className="flex flex-col">
                            {inGroup.map((entry) => (
                                <ThreadCard
                                    key={entry.thread.id}
                                    thread={entry.thread}
                                    meta={`Read ${entry.when}`}
                                    onBookmark={() => onBookmark(entry.thread)}
                                />
                            ))}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
