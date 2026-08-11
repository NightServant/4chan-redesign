import { Link } from '@inertiajs/react';
import { LayoutGridIcon } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/clover/empty-state';
import { FormField } from '@/components/clover/form-field';
import { PageHeader } from '@/components/clover/page-header';
import { SectionLabel } from '@/components/clover/section-label';
import { BoardCard } from '@/components/communities/board-card';
import { Input } from '@/components/ui/input';
import { plural } from '@/lib/utils';
import { edit as editProfile } from '@/routes/profile';
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
    /**
     * Whether this anon has opted into boards 4chan marks as not worksafe.
     * Defaults to false, so a caller that forgets to pass it hides them
     * rather than showing them: the safe way round is the one that survives
     * a mistake.
     */
    showsMature?: boolean;
}

/**
 * The board directory.
 *
 * Every slug listed is one the router accepts, because the entire page is
 * links: a directory that offers a board the router 404s is worse than a
 * short directory. The list therefore tracks `config/clover.php` through the
 * fixture and is never padded out with plausible board names.
 */
export function BoardDirectory({
    boards,
    showsMature = false,
}: BoardDirectoryProps) {
    const [query, setQuery] = useState('');
    const [subscriptions, setSubscriptions] = useState<Subscriptions>(() =>
        Object.fromEntries(
            boards.map((entry) => [entry.slug, entry.subscribed]),
        ),
    );

    /* Every count, the search and the grid all read from this rather than
       from `boards`, so a hidden board cannot leak back through a total. */
    const permitted = boards.filter((entry) => showsMature || entry.worksafe);
    const hiddenCount = boards.length - permitted.length;

    const subscribedCount = permitted.filter(
        (entry) => subscriptions[entry.slug],
    ).length;
    const visible = permitted.filter((entry) => matches(entry, query));

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
                        href={editProfile()}
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
