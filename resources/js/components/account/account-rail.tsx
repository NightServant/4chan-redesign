import { Link } from '@inertiajs/react';
import { MachineValue } from '@/components/clover/machine-value';
import { Panel } from '@/components/clover/panel';
import { bookmarks, history as historyRoute } from '@/routes';
import { edit as editTwoFactor } from '@/routes/two-factor';
import type { ProfileComment } from '@/types/clover';

/**
 * The account screen's rail.
 *
 * The page was measured against the shell so its chrome and its content share
 * an edge, but it carried no rail — so on a wide display the identity block
 * ran the full width while the tabs sat in a 720px column beneath it, with
 * two empty bands either side. The shell's extra width is the rail's width;
 * a page measured for one and not carrying it is a page with a hole in it.
 *
 * Everything here is counted from props the page already receives. No new
 * request, and nothing this application cannot count: an anon's own replies
 * carry the board they were written on, so "where you post" is real
 * arithmetic rather than an invented interest graph.
 */
type AccountRailProps = {
    comments: readonly ProfileComment[];
};

/** Where this anon actually writes, most first. Ties break alphabetically. */
function boardTally(
    comments: readonly ProfileComment[],
): { board: string; replies: number }[] {
    const counts = new Map<string, number>();

    for (const comment of comments) {
        counts.set(comment.board, (counts.get(comment.board) ?? 0) + 1);
    }

    return [...counts.entries()]
        .map(([board, replies]) => ({ board, replies }))
        .sort((a, b) => b.replies - a.replies || a.board.localeCompare(b.board))
        .slice(0, 6);
}

const LINKS = [
    { title: 'Bookmarks', href: bookmarks() },
    { title: 'History', href: historyRoute() },
    { title: 'Two-factor authentication', href: editTwoFactor() },
] as const;

function AccountRail({ comments }: AccountRailProps) {
    const boards = boardTally(comments);

    return (
        <aside
            aria-label="Account sidebar"
            data-slot="account-rail"
            className="sticky top-22 hidden w-(--measure-rail) shrink-0 flex-col gap-3.5 self-start lg:flex"
        >
            {/* Only when there is something to count. An empty panel headed
                "Where you post" on a fresh account states a fact it does not
                have -- the same reason the notifications screen says what it
                cannot do rather than "you are caught up". */}
            {boards.length > 0 ? (
                <Panel title="Where you post">
                    <dl className="flex flex-col gap-2">
                        {boards.map((entry) => (
                            <div
                                key={entry.board}
                                className="flex items-baseline gap-2"
                            >
                                <dt className="text-meta text-muted-foreground">
                                    {entry.board}
                                </dt>
                                <dd className="ml-auto">
                                    <MachineValue className="text-foreground">
                                        {String(entry.replies)}
                                    </MachineValue>
                                </dd>
                            </div>
                        ))}
                    </dl>
                </Panel>
            ) : null}

            {/* The rows the avatar dropdown carries at this width, in reach
                without opening it. Not a second copy of the settings drawer:
                that is the below-`md` surface, and this renders only at `lg`
                and up. */}
            <Panel title="Your account">
                <ul className="flex list-none flex-col gap-2">
                    {LINKS.map((link) => (
                        <li key={link.title}>
                            <Link
                                href={link.href}
                                className="text-meta text-muted-foreground transition-colors duration-[var(--duration-hover)] ease-standard hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                            >
                                {link.title}
                            </Link>
                        </li>
                    ))}
                </ul>
            </Panel>
        </aside>
    );
}

export { AccountRail };
export type { AccountRailProps };
