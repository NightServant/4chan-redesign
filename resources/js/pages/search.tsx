import { Link } from '@inertiajs/react';
import { SearchIcon } from 'lucide-react';
import { BoardAvatar } from '@/components/clover/board-avatar';
import { EmptyState } from '@/components/clover/empty-state';
import { MachineValue } from '@/components/clover/machine-value';
import { PageMeta } from '@/components/clover/page-meta';
import { SectionLabel } from '@/components/clover/section-label';
import { ThreadCard } from '@/components/clover/thread-card';
import { useBookmark } from '@/hooks/use-bookmark';
import { board as boardRoute } from '@/routes';
import type { Board, Thread } from '@/types/clover';

/**
 * Search results, for pressing Enter in the header field.
 *
 * The dropdown answers the common case; this is the URL worth sharing and the
 * place to see everything a query matched rather than the first handful.
 *
 * It searches this application's database, not 4chan: there is no search
 * endpoint upstream and a browser could not call one if there were.
 */
interface SearchProps {
    query: string;
    boards: Board[];
    threads: Thread[];
}

export default function Search({ query, boards, threads }: SearchProps) {
    const { toggleBookmark, authGate } = useBookmark();

    const total = boards.length + threads.length;

    return (
        <>
            <PageMeta
                title={query === '' ? 'Search' : `${query} — search`}
                description={
                    query === ''
                        ? 'Search every thread Clover holds, by title and by body.'
                        : `Threads matching “${query}” across every board Clover mirrors.`
                }
            />

            <div className="mx-auto flex w-full max-w-[820px] flex-col gap-6 px-6 py-8">
                <div className="flex flex-col gap-2">
                    <SectionLabel>Search</SectionLabel>
                    <h1 className="font-display text-h1 font-semibold text-foreground">
                        {query === ''
                            ? 'Search boards and threads'
                            : `Results for "${query}"`}
                    </h1>
                    {query !== '' ? (
                        <MachineValue>
                            {total} {total === 1 ? 'result' : 'results'}
                        </MachineValue>
                    ) : null}
                </div>

                {query === '' ? (
                    <EmptyState
                        icon={<SearchIcon />}
                        title="Nothing searched yet"
                        body="Search from the field in the header. Boards match on their slug, title and description; threads match on their subject and opening post."
                    />
                ) : total === 0 ? (
                    <EmptyState
                        icon={<SearchIcon />}
                        title="No matches"
                        body={`Nothing on Clover matches "${query}". Only synced boards and threads are searchable.`}
                    />
                ) : null}

                {boards.length > 0 ? (
                    <section className="flex flex-col gap-3">
                        <SectionLabel>Boards</SectionLabel>
                        <ul className="flex flex-col divide-y divide-border border-y border-border">
                            {boards.map((board) => (
                                <li key={board.slug}>
                                    <Link
                                        href={boardRoute.url(
                                            board.slug.replaceAll('/', ''),
                                        )}
                                        className="flex items-center gap-3 py-3 hover:bg-surface-hover"
                                    >
                                        <BoardAvatar
                                            slug={board.slug}
                                            size={30}
                                            decorative
                                        />
                                        <span className="text-body-sm font-semibold text-foreground">
                                            {board.name}
                                        </span>
                                        <MachineValue className="ml-auto">
                                            {board.slug} · {board.threads}{' '}
                                            threads
                                        </MachineValue>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null}

                {threads.length > 0 ? (
                    <section className="flex flex-col gap-3">
                        <SectionLabel>Threads</SectionLabel>
                        <div className="flex flex-col gap-4">
                            {threads.map((thread) => (
                                <ThreadCard
                                    key={thread.no}
                                    thread={thread}
                                    onBookmark={() => toggleBookmark(thread)}
                                />
                            ))}
                        </div>
                    </section>
                ) : null}
            </div>

            {authGate}
        </>
    );
}
