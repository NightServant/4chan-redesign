import { Link, router } from '@inertiajs/react';
import { BookmarkIcon, BookmarkXIcon, SearchXIcon } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/clover/empty-state';
import { FormField } from '@/components/clover/form-field';
import { MachineValue } from '@/components/clover/machine-value';
import { PageHeader } from '@/components/clover/page-header';
import { PageMeta } from '@/components/clover/page-meta';
import { SectionLabel } from '@/components/clover/section-label';
import { ThreadCard } from '@/components/clover/thread-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { plural } from '@/lib/utils';
import { dashboard } from '@/routes';
import { destroy as bookmarkDestroy } from '@/routes/threads/bookmark';
import type { Bookmark } from '@/types/clover';

type Sort = 'saved' | 'replies';

const SORT_OPTIONS: ReadonlyArray<{ value: Sort; label: string }> = [
    { value: 'saved', label: 'Recently saved' },
    { value: 'replies', label: 'Most replies' },
];

/**
 * `saved` keeps fixture order, which already runs most-recently-saved first.
 * `replies` orders by the thread's reply count. Neither has a URL of its
 * own, so the sort is local state rather than a route param.
 */
function sortBookmarks(bookmarks: Bookmark[], sort: Sort): Bookmark[] {
    if (sort === 'replies') {
        return [...bookmarks].sort(
            (a, b) => b.thread.replies - a.thread.replies,
        );
    }

    return bookmarks;
}

/**
 * Threads this anon saved.
 *
 * The design project has no screen for this one. Rather than draw a second
 * thread card, each row is the same `ThreadCard` the feed and the board pages
 * use, with the two things only a bookmark carries beneath it: when it was
 * saved, and the note the anon wrote on it.
 */
type BookmarksProps = {
    /** Already filtered to boards this anon may see, newest saved first. */
    bookmarks: Bookmark[];
};

export default function Bookmarks({ bookmarks: saved }: BookmarksProps) {
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState<Sort>('saved');

    const needle = query.trim().toLowerCase();
    const visible = sortBookmarks(
        saved.filter((bookmark) =>
            bookmark.thread.title.toLowerCase().includes(needle),
        ),
        sort,
    );

    return (
        <>
            <PageMeta
                title="Bookmarks"
                description="Threads you saved. They stay here until you remove them."
            />

            <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6 px-6 py-8">
                <PageHeader
                    title="Bookmarks"
                    description={plural(saved.length, 'saved thread')}
                />

                <div className="flex flex-wrap items-end gap-4">
                    <FormField
                        label="Search bookmarks"
                        className="min-w-[220px] flex-1"
                        labelClassName="text-meta"
                    >
                        <Input
                            type="search"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Thread title"
                        />
                    </FormField>

                    <FormField
                        label="Sort bookmarks"
                        labelClassName="text-meta"
                    >
                        {(control) => (
                            <Select
                                value={sort}
                                onValueChange={(value) =>
                                    setSort(value as Sort)
                                }
                            >
                                <SelectTrigger
                                    id={control.id}
                                    className="w-[180px]"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {SORT_OPTIONS.map((option) => (
                                        <SelectItem
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </FormField>
                </div>

                {visible.length === 0 ? (
                    <EmptyState
                        icon={
                            needle === '' ? <BookmarkIcon /> : <SearchXIcon />
                        }
                        title={
                            needle === ''
                                ? 'No bookmarks'
                                : 'No bookmarks match'
                        }
                        body={
                            needle === ''
                                ? 'Threads you save appear here and stay until you remove them.'
                                : `Nothing matches "${query}".`
                        }
                        action={
                            needle === '' ? (
                                <Button variant="outline" asChild>
                                    <Link href={dashboard.url()}>
                                        Browse the feed
                                    </Link>
                                </Button>
                            ) : null
                        }
                    />
                ) : (
                    /* One provider for the row of remove buttons. `app.tsx`
                       supplies one too, but keeping it here means the page
                       does not depend on ambient context to be renderable,
                       the way `AppSidebar` already does. */
                    <TooltipProvider>
                        <ul
                            aria-label="Saved threads"
                            className="flex flex-col gap-6"
                        >
                            {visible.map((bookmark) => (
                                <li
                                    key={bookmark.thread.no}
                                    className="flex flex-col gap-2"
                                >
                                    <ThreadCard thread={bookmark.thread} />

                                    {bookmark.note ? (
                                        <div className="flex flex-col gap-1 border-l-2 border-primary-line pl-3">
                                            <SectionLabel>
                                                Your note
                                            </SectionLabel>
                                            <p className="text-body-sm text-pretty text-muted-foreground">
                                                {bookmark.note}
                                            </p>
                                        </div>
                                    ) : null}

                                    <div className="flex items-center justify-between gap-3">
                                        <MachineValue>
                                            {bookmark.savedAt}
                                        </MachineValue>

                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label={`Remove bookmark: ${bookmark.thread.title}`}
                                                    /* Deleted, not hidden.
                                                       An anon who removes a
                                                       bookmark means it, and
                                                       the list reloads from
                                                       the server rather than
                                                       filtering a copy it
                                                       still holds. */
                                                    onClick={() =>
                                                        router.delete(
                                                            bookmarkDestroy(
                                                                bookmark.thread
                                                                    .id,
                                                            ).url,
                                                            {
                                                                preserveScroll: true,
                                                            },
                                                        )
                                                    }
                                                >
                                                    <BookmarkXIcon aria-hidden="true" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                Remove bookmark
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </TooltipProvider>
                )}
            </div>
        </>
    );
}
