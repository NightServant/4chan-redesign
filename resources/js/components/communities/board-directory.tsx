import { LayoutGridIcon } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/clover/empty-state';
import { FormField } from '@/components/clover/form-field';
import { PageHeader } from '@/components/clover/page-header';
import { SectionLabel } from '@/components/clover/section-label';
import { BoardCard } from '@/components/communities/board-card';
import { Input } from '@/components/ui/input';
import { plural } from '@/lib/utils';
import type { BoardDirectoryEntry } from '@/types/clover';

/** Subscription state, keyed by slug. Local: there is no backend. */
type Subscriptions = Record<string, boolean>;

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
    boards: readonly BoardDirectoryEntry[];
}

/**
 * The board directory.
 *
 * Every slug listed is one the router accepts, because the entire page is
 * links: a directory that offers a board the router 404s is worse than a
 * short directory. The list therefore tracks `config/clover.php` through the
 * fixture and is never padded out with plausible board names.
 */
export function BoardDirectory({ boards }: BoardDirectoryProps) {
    const [query, setQuery] = useState('');
    const [subscriptions, setSubscriptions] = useState<Subscriptions>(() =>
        Object.fromEntries(
            boards.map((entry) => [entry.slug, entry.subscribed]),
        ),
    );

    const subscribedCount = boards.filter(
        (entry) => subscriptions[entry.slug],
    ).length;
    const visible = boards.filter((entry) => matches(entry, query));

    function toggleSubscription(slug: string) {
        setSubscriptions((current) => ({
            ...current,
            [slug]: !current[slug],
        }));
    }

    return (
        <>
            <PageHeader
                title="Communities"
                description={`${plural(boards.length, 'board')} · ${subscribedCount} subscribed`}
            />

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
                    body={`Nothing matches "${query}". Clover has six boards.`}
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

                            <ul className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
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
                                                subscribed={Boolean(
                                                    subscriptions[entry.slug],
                                                )}
                                                onToggleSubscribe={() =>
                                                    toggleSubscription(
                                                        entry.slug,
                                                    )
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
