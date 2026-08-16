import { Link, router } from '@inertiajs/react';
import { LayoutGridIcon } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/clover/empty-state';
import { FormField } from '@/components/clover/form-field';
import { PageHeader } from '@/components/clover/page-header';
import { SectionLabel } from '@/components/clover/section-label';
import { BoardCard } from '@/components/communities/board-card';
import { Input } from '@/components/ui/input';
import { plural } from '@/lib/utils';
import { subscribe as subscribeToBoard } from '@/routes/boards';
import { edit as editSettings } from '@/routes/settings';
import type { BoardDirectoryEntry } from '@/types/clover';

/** Subscription state, keyed by slug. Local: there is no backend. */
function matches(entry: BoardDirectoryEntry, query: string): boolean {
    const needle = query.trim().toLowerCase();

    if (needle === '') {
        return true;
    }

    return [entry.slug, entry.name, entry.description].some((field) =>
        field.toLowerCase().includes(needle),
    );
}

/**
 * Categories in the order the directory first mentions them, rather than
 * alphabetically or from a hardcoded list: a new category added to the data
 * then appears without anything here needing to know its name.
 */
function categoriesOf(boards: readonly BoardDirectoryEntry[]): string[] {
    return [...new Set(boards.map((entry) => entry.category))];
}

export interface BoardDirectoryProps {
    /**
     * Already filtered server-side. This component shows what it is given and
     * makes no access decision of its own.
     */
    boards: readonly BoardDirectoryEntry[];
    /**
     * How many boards this anon's content settings are holding back.
     *
     * A count rather than the boards themselves, which is the whole point:
     * the notice below stays honest about the directory being incomplete
     * without the browser ever receiving a board the anon asked not to see.
     * Defaults to zero, so a caller that forgets it under-claims rather than
     * inventing a number.
     */
    hiddenCount?: number;
}

/**
 * The board directory.
 *
 * Every slug listed is one the router accepts, because the entire page is
 * links: a directory that offers a board the router 404s is worse than a
 * short directory. Both lists now come from the `boards` table, so they cannot
 * disagree about which boards exist.
 *
 * The filtering used to happen here, on a list that already held every board.
 * That is not a boundary — data the browser holds is data the anon has — so it
 * moved into the query and this component lost its `showsMature` prop.
 */
export function BoardDirectory({
    boards,
    hiddenCount = 0,
}: BoardDirectoryProps) {
    const [query, setQuery] = useState('');

    /* Nothing to filter: the server sent exactly the boards this anon may
       see. `permitted` stays as the name every count and the grid read from,
       so the guarantee it carried is unchanged — it is now upheld a layer
       down instead of here. */
    const permitted = boards;

    const subscribedCount = permitted.filter(
        (entry) => entry.subscribed,
    ).length;
    const visible = permitted.filter((entry) => matches(entry, query));

    /**
     * Following is stored, so the pressed state and the count come back from
     * the server. This was local state seeded from the prop and then diverging
     * from it — a button reporting `aria-pressed` for something nothing kept.
     */
    function toggleSubscription(entry: BoardDirectoryEntry) {
        const url = subscribeToBoard(entry.id).url;

        if (entry.subscribed) {
            router.delete(url, { preserveScroll: true });

            return;
        }

        router.post(url, {}, { preserveScroll: true });
    }

    return (
        <>
            <PageHeader
                title="Communities"
                description={`${plural(permitted.length, 'board')} · ${subscribedCount} subscribed`}
            />

            {/* Hiding boards without saying so leaves the directory quietly
                incomplete, and leaves the setting undiscoverable for anyone
                who never thinks to go looking for it. */}
            {hiddenCount > 0 ? (
                <p
                    data-slot="mature-notice"
                    className="text-meta text-muted-foreground"
                >
                    {plural(hiddenCount, 'board')} hidden by your content
                    settings.{' '}
                    <Link
                        href={editSettings()}
                        className="text-primary underline decoration-primary-line underline-offset-2"
                    >
                        Change what you see
                    </Link>
                    .
                </p>
            ) : null}

            <FormField
                label="Search boards"
                className="max-w-[420px]"
                labelClassName="text-meta"
            >
                <Input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Slug, name or description"
                />
            </FormField>

            {visible.length === 0 ? (
                <EmptyState
                    icon={<LayoutGridIcon />}
                    title="No boards match"
                    body={`Nothing matches "${query}".`}
                />
            ) : (
                <div className="flex flex-col gap-8">
                    {categoriesOf(visible).map((category) => (
                        <section
                            key={category}
                            aria-label={category}
                            className="flex flex-col gap-3"
                        >
                            <SectionLabel>{category}</SectionLabel>

                            {/* `minmax(min(320px,100%),1fr)`, not a bare
                                `minmax(320px,1fr)`: at a 320px viewport this
                                container is 272px after its own padding, and
                                a bare 320px minimum overflowed it by 48px,
                                overlapping neighbouring cells. `min()` lets
                                the track's floor collapse to the container's
                                width instead of forcing the container wider
                                than it is. */}
                            <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(320px,100%),1fr))] gap-4">
                                {visible
                                    .filter(
                                        (entry) => entry.category === category,
                                    )
                                    .map((entry) => (
                                        <li
                                            key={entry.slug}
                                            className="flex flex-col"
                                        >
                                            <BoardCard
                                                entry={entry}
                                                subscribed={entry.subscribed}
                                                onToggleSubscribe={() =>
                                                    toggleSubscription(entry)
                                                }
                                            />
                                        </li>
                                    ))}
                            </ul>
                        </section>
                    ))}
                </div>
            )}
        </>
    );
}
