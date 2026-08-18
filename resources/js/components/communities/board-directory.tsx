import { Link } from '@inertiajs/react';
import { LayoutGridIcon } from 'lucide-react';
import { EmptyState } from '@/components/clover/empty-state';
import { PageHeader } from '@/components/clover/page-header';
import { SectionLabel } from '@/components/clover/section-label';
import { BoardRow } from '@/components/communities/board-row';
import { useBoardSubscription } from '@/hooks/use-board-subscription';
import { plural } from '@/lib/utils';
import { edit as editSettings } from '@/routes/settings';
import type { BoardDirectoryEntry } from '@/types/clover';

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
 *
 * ## No search box of its own
 *
 * There was a "Search boards" field here, filtering the list in the browser.
 * Search is the header's job: it has its own page, its own results tabs and a
 * Communities tab among them (task 7). A second field with its own matching
 * rules, reachable only from this one screen, was a second search that behaved
 * differently from the one every other screen offers — and it filtered a list
 * of 53 that the ruled layout now fits far more of on a phone anyway. The
 * state, the matcher and the tests that only existed for it are gone rather
 * than hidden behind a breakpoint.
 *
 * ## Below `md` this is a ruled list
 *
 * `divide-y` on the list draws the hairline between rows; the grid and the
 * gaps between cards only start at `md`. See `BoardRow` for the other half of
 * that contract.
 */
export function BoardDirectory({
    boards,
    hiddenCount = 0,
}: BoardDirectoryProps) {
    /**
     * The shared hook, not a fourth copy of the same call. The copy this
     * component carried wrote through the router correctly but had no
     * `AuthGate`, and the subscribe routes sit behind `auth`: a signed-out
     * anon pressing Join on a page that is open to read was bounced to the
     * login form. The hook returns the gate with the toggle so a caller cannot
     * take one and forget the other.
     */
    const { toggleSubscription, authGate } = useBoardSubscription();

    /* Nothing to filter: the server sent exactly the boards this anon may
       see. `permitted` stays as the name every count and the list read from,
       so the guarantee it carried is unchanged — it is now upheld a layer
       down instead of here. */
    const permitted = boards;

    const subscribedCount = permitted.filter(
        (entry) => entry.subscribed,
    ).length;

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

            {permitted.length === 0 ? (
                <EmptyState
                    icon={<LayoutGridIcon />}
                    title="No boards to show"
                    body="Nothing is listed here right now."
                />
            ) : (
                <div className="flex flex-col gap-8">
                    {categoriesOf(permitted).map((category) => (
                        <section
                            key={category}
                            aria-label={category}
                            className="flex flex-col gap-3"
                        >
                            <SectionLabel>{category}</SectionLabel>

                            {/* One row per line below `md`, ruled between
                                rows. At `md` the deck comes back:
                                `minmax(min(320px,100%),1fr)`, not a bare
                                `minmax(320px,1fr)`, because a bare 320px
                                minimum overflows a narrow container by forcing
                                the track wider than the space there is. */}
                            <ul
                                data-slot="board-list"
                                className="flex flex-col divide-y divide-border border-b border-border md:grid md:grid-cols-[repeat(auto-fill,minmax(min(320px,100%),1fr))] md:gap-4 md:divide-y-0 md:border-0"
                            >
                                {permitted
                                    .filter(
                                        (entry) => entry.category === category,
                                    )
                                    .map((entry) => (
                                        <li
                                            key={entry.slug}
                                            className="flex flex-col"
                                        >
                                            <BoardRow
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

            {authGate}
        </>
    );
}
