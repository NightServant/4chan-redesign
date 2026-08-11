import { Head } from '@inertiajs/react';
import { Eraser, History as HistoryIcon, Search } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/clover/empty-state';
import { PageHeader } from '@/components/clover/page-header';
import { Pagination } from '@/components/clover/pagination';
import { SectionLabel } from '@/components/clover/section-label';
import { HistoryCard } from '@/components/history/history-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { HISTORY } from '@/fixtures/clover';
import type { HistoryEntry } from '@/types/clover';

type SortOption = 'recent' | 'unfinished';

const SORT_LABELS: Record<SortOption, string> = {
    recent: 'Most recent',
    unfinished: 'Least finished',
};

const GROUPS = ['Today', 'Yesterday', 'Earlier'] as const;

type Group = (typeof GROUPS)[number];

const PAGE_SIZE = 4;

/**
 * `when` is a pre-formatted display string, not a timestamp, so the day is
 * read off its prefix. That is all the fixture carries and all the backend
 * will need to carry: the grouping is a display concern either way.
 */
function groupOf(entry: HistoryEntry): Group {
    if (entry.when.startsWith('Today')) {
        return 'Today';
    }

    if (entry.when.startsWith('Yesterday')) {
        return 'Yesterday';
    }

    return 'Earlier';
}

function matches(entry: HistoryEntry, query: string): boolean {
    const needle = query.trim().toLowerCase();

    if (needle === '') {
        return true;
    }

    return (
        entry.title.toLowerCase().includes(needle) ||
        entry.board.toLowerCase().includes(needle)
    );
}

/**
 * `recent` keeps fixture order, which already runs newest first. `unfinished`
 * puts the least-read thread on top, which is the one an anon is most likely
 * to be looking for.
 */
function sortEntries(
    entries: readonly HistoryEntry[],
    sort: SortOption,
): HistoryEntry[] {
    const sorted = [...entries];

    if (sort === 'unfinished') {
        sorted.sort((a, b) => a.progress - b.progress);
    }

    return sorted;
}

/**
 * Threads this anon opened.
 *
 * Removal and "Clear all" are local component state. There is no backend and
 * no device store yet, so nothing here pretends to persist: a reload brings
 * the whole list back, and faking a request would hide that.
 *
 * The design also declares an "All time / Last 7 days / Last 30 days" range
 * filter and then never applies it to the list. It is not ported. Even wired
 * up correctly it could not discriminate, since every entry falls inside
 * seven days, so all three options would render the same list.
 */
export default function History() {
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState<SortOption>('recent');
    const [removed, setRemoved] = useState<readonly number[]>([]);
    const [page, setPage] = useState(1);

    const remaining = HISTORY.filter((entry) => !removed.includes(entry.no));
    const matched = sortEntries(
        remaining.filter((entry) => matches(entry, query)),
        sort,
    );

    const pageCount = Math.max(1, Math.ceil(matched.length / PAGE_SIZE));
    const current = Math.min(page, pageCount);
    const visible = matched.slice(
        (current - 1) * PAGE_SIZE,
        current * PAGE_SIZE,
    );

    function remove(no: number) {
        setRemoved((entries) => [...entries, no]);
    }

    function clearAll() {
        setRemoved(HISTORY.map((entry) => entry.no));
    }

    function reset() {
        setQuery('');
        setRemoved([]);
        setPage(1);
    }

    const searching = query.trim() !== '';

    return (
        <>
            <Head title="History" />

            <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-[18px] px-6 py-6">
                <PageHeader
                    title="History"
                    description="Threads you opened. Stored on this device only."
                    action={
                        <Button
                            variant="ghost"
                            onClick={clearAll}
                            disabled={remaining.length === 0}
                        >
                            <Eraser aria-hidden="true" />
                            Clear all
                        </Button>
                    }
                />

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative min-w-60 flex-1">
                        <Search
                            aria-hidden="true"
                            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint"
                        />
                        <Input
                            type="search"
                            value={query}
                            onChange={(event) => {
                                setQuery(event.target.value);
                                setPage(1);
                            }}
                            aria-label="Search your history"
                            placeholder="Search your history"
                            className="pl-9"
                        />
                    </div>

                    <Select
                        value={sort}
                        onValueChange={(value) => {
                            setSort(value as SortOption);
                            setPage(1);
                        }}
                    >
                        <SelectTrigger aria-label="Sort history">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {(Object.keys(SORT_LABELS) as SortOption[]).map(
                                (option) => (
                                    <SelectItem key={option} value={option}>
                                        {SORT_LABELS[option]}
                                    </SelectItem>
                                ),
                            )}
                        </SelectContent>
                    </Select>
                </div>

                {visible.length === 0 ? (
                    <EmptyState
                        icon={<HistoryIcon />}
                        title="No history to show"
                        body={
                            searching
                                ? `Nothing matches "${query}".`
                                : 'Threads you open appear here so you can pick them back up.'
                        }
                        action={
                            <Button variant="outline" onClick={reset}>
                                Reset
                            </Button>
                        }
                    />
                ) : (
                    <div className="flex flex-col gap-5">
                        {GROUPS.map((group) => {
                            const entries = visible.filter(
                                (entry) => groupOf(entry) === group,
                            );

                            if (entries.length === 0) {
                                return null;
                            }

                            return (
                                <section
                                    key={group}
                                    aria-label={group}
                                    className="flex flex-col gap-2.5"
                                >
                                    <SectionLabel>{group}</SectionLabel>

                                    <div className="flex flex-col gap-3">
                                        {entries.map((entry) => (
                                            <HistoryCard
                                                key={entry.no}
                                                entry={entry}
                                                onRemove={() =>
                                                    remove(entry.no)
                                                }
                                            />
                                        ))}
                                    </div>
                                </section>
                            );
                        })}

                        {pageCount > 1 ? (
                            <Pagination
                                page={current}
                                pageCount={pageCount}
                                onChange={setPage}
                                className="justify-center"
                            />
                        ) : null}
                    </div>
                )}
            </div>
        </>
    );
}
