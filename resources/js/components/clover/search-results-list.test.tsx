import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SearchResultsList } from '@/components/clover/search-results-list';
import { makeBoard, makeThread } from '@/fixtures/factories';
import { EMPTY_SUGGESTIONS } from '@/hooks/use-search-suggestions';

vi.mock('@inertiajs/react', () => ({
    Link: ({
        href,
        children,
        ...props
    }: { href: string; children: ReactNode } & Record<string, unknown>) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

/**
 * The grouped list itself, extracted out of `SearchField`'s dropdown — which
 * used to be the only place it rendered. The search page's below-`md`
 * suggestions screen (task 6) draws the exact same groups (recent searches,
 * busiest-or-matched boards, threads, the empty message) inline in the page
 * rather than inside a floating popover, so this is the shared piece: given
 * results, draw the list. Positioning belongs to the caller.
 */
function renderList(
    overrides: Partial<Parameters<typeof SearchResultsList>[0]> = {},
) {
    return render(
        <SearchResultsList
            listId="results"
            query=""
            loading={false}
            results={EMPTY_SUGGESTIONS}
            history={[]}
            onSelectHistory={vi.fn()}
            onForgetHistory={vi.fn()}
            {...overrides}
        />,
    );
}

describe('SearchResultsList', () => {
    it('is a labelled listbox', () => {
        renderList();

        expect(
            screen.getByRole('listbox', { name: 'Search results' }),
        ).toBeInTheDocument();
    });

    it('omits the recent-searches group when there is no history', () => {
        renderList({ history: [] });

        expect(
            screen.queryByRole('group', { name: 'Recent searches' }),
        ).not.toBeInTheDocument();
    });

    it('lists recent searches when there is history and the query is empty', () => {
        renderList({ history: ['init systems', 'mechanical keyboards'] });

        const group = screen.getByRole('group', { name: 'Recent searches' });

        expect(group).toHaveTextContent('init systems');
        expect(group).toHaveTextContent('mechanical keyboards');
    });

    it('hides recent searches once there is a query', () => {
        renderList({ history: ['init systems'], query: 'g' });

        expect(
            screen.queryByRole('group', { name: 'Recent searches' }),
        ).not.toBeInTheDocument();
    });

    it('runs the search again when a recent term is pressed', async () => {
        const user = userEvent.setup();
        const onSelectHistory = vi.fn();

        renderList({ history: ['init systems'], onSelectHistory });

        await user.click(screen.getByRole('option', { name: 'init systems' }));

        expect(onSelectHistory).toHaveBeenCalledWith('init systems');
    });

    it('forgets a single term without running it', async () => {
        const user = userEvent.setup();
        const onForgetHistory = vi.fn();
        const onSelectHistory = vi.fn();

        renderList({
            history: ['drop me'],
            onForgetHistory,
            onSelectHistory,
        });

        await user.click(
            screen.getByRole('button', {
                name: 'Remove "drop me" from recent searches',
            }),
        );

        expect(onForgetHistory).toHaveBeenCalledWith('drop me');
        expect(onSelectHistory).not.toHaveBeenCalled();
    });

    it('heads the boards group "Busiest boards" for an empty query and "Boards" for one', () => {
        const boards = [makeBoard({ slug: '/g/', name: 'Technology' })];

        const { rerender } = renderList({
            query: '',
            results: { boards, threads: [] },
        });
        expect(
            screen.getByRole('group', { name: 'Busiest boards' }),
        ).toBeInTheDocument();

        rerender(
            <SearchResultsList
                listId="results"
                query="g"
                loading={false}
                results={{ boards, threads: [] }}
                history={[]}
                onSelectHistory={vi.fn()}
                onForgetHistory={vi.fn()}
            />,
        );
        expect(
            screen.getByRole('group', { name: 'Boards' }),
        ).toBeInTheDocument();
    });

    it('links each board at its own page', () => {
        renderList({
            results: {
                boards: [makeBoard({ slug: '/g/', name: 'Technology' })],
                threads: [],
            },
        });

        expect(
            screen.getByRole('option', { name: /Technology/ }),
        ).toHaveAttribute('href', '/g');
    });

    it('links each thread at its own page', () => {
        renderList({
            results: {
                boards: [],
                threads: [
                    makeThread({
                        no: 58210441,
                        board: '/g/',
                        title: 'RISC-V laptops as daily drivers',
                    }),
                ],
            },
        });

        expect(
            screen.getByRole('option', { name: /RISC-V laptops/ }),
        ).toHaveAttribute('href', '/g/58210441');
    });

    it('says plainly when nothing matches a real query', () => {
        renderList({ query: 'zzz', results: EMPTY_SUGGESTIONS });

        expect(screen.getByText('Nothing matches "zzz".')).toBeInTheDocument();
    });

    it('says it is searching while loading', () => {
        renderList({ query: 'g', loading: true, results: EMPTY_SUGGESTIONS });

        expect(screen.getByText('Searching.')).toBeInTheDocument();
    });

    it('invites typing when the query and the history are both empty', () => {
        renderList({ query: '', history: [], results: EMPTY_SUGGESTIONS });

        expect(
            screen.getByText('Type to search boards and threads.'),
        ).toBeInTheDocument();
    });
});
