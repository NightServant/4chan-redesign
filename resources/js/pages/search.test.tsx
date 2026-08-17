import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeBoard, makeThread } from '@/fixtures/factories';
import { rememberSearch } from '@/lib/search-history';
import Search from '@/pages/search';

const { router } = vi.hoisted(() => ({
    router: { visit: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

vi.mock('@inertiajs/react', () => ({
    router,
    Head: () => null,
    usePage: () => ({ props: { auth: { user: null } } }),
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

function mockFetch(payload: unknown = { boards: [], threads: [] }) {
    const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(payload),
    });

    vi.stubGlobal('fetch', fetchMock);

    return fetchMock;
}

const BUSIEST_BOARDS = [
    makeBoard({ slug: '/v/', name: 'Video Games' }),
    makeBoard({ slug: '/int/', name: 'International' }),
];

function searchProps(overrides: Partial<Parameters<typeof Search>[0]> = {}) {
    return {
        query: '',
        boards: [],
        threads: [],
        busiestBoards: BUSIEST_BOARDS,
        ...overrides,
    };
}

beforeEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    router.visit.mockClear();
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('Search — the app bar, below `md`', () => {
    it('renders a back control and a field, both `md:hidden`', () => {
        mockFetch();
        render(<Search {...searchProps()} />);

        const back = screen.getByRole('button', { name: /back/i });
        const field = screen.getByRole('combobox', {
            name: /search boards and threads/i,
        });

        /* Both are hidden by the same ancestor app bar, not individually --
           `md:hidden` on the shared container is what makes the header's
           own controls the only ones on screen at `md` and up. */
        expect(back.closest('[class*="md:hidden"]')).not.toBeNull();
        expect(field.closest('[class*="md:hidden"]')).not.toBeNull();
    });

    /** This screen exists to be typed into. */
    it('focuses the field on arrival', () => {
        mockFetch();
        render(<Search {...searchProps()} />);

        expect(
            screen.getByRole('combobox', {
                name: /search boards and threads/i,
            }),
        ).toHaveFocus();
    });

    it('returns to where the anon came from when back is pressed', async () => {
        const user = userEvent.setup();
        const historyBack = vi.spyOn(window.history, 'back');
        mockFetch();

        render(<Search {...searchProps()} />);
        await user.click(screen.getByRole('button', { name: /back/i }));

        expect(historyBack).toHaveBeenCalled();
        historyBack.mockRestore();
    });
});

describe('Search — the suggestions screen, below `md`', () => {
    it('renders the busiest boards from the page prop, without fetching first', () => {
        const fetchMock = mockFetch();
        render(<Search {...searchProps()} />);

        expect(screen.getByText('Video Games')).toBeInTheDocument();
        expect(screen.getByText('International')).toBeInTheDocument();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('shows recent searches from real browser history, oldest last', () => {
        mockFetch();
        rememberSearch('mechanical keyboards');
        rememberSearch('init systems');

        render(<Search {...searchProps()} />);

        const group = screen.getByRole('group', { name: 'Recent searches' });
        expect(group).toHaveTextContent('init systems');
        expect(group).toHaveTextContent('mechanical keyboards');
    });

    /** No heading over nothing: the section does not exist at all when empty. */
    it('omits the recent-searches section entirely when there is no history', () => {
        mockFetch();
        render(<Search {...searchProps()} />);

        expect(
            screen.queryByRole('group', { name: 'Recent searches' }),
        ).not.toBeInTheDocument();
    });

    it('invents no section this codebase has no source for', () => {
        mockFetch();
        render(<Search {...searchProps()} />);

        for (const invented of [
            'Trending',
            'Trending Communities',
            'Based on your interests',
        ]) {
            expect(screen.queryByText(invented)).not.toBeInTheDocument();
        }
    });

    it('fetches live suggestions once the anon types, same as the dropdown', async () => {
        const fetchMock = mockFetch({
            boards: [{ slug: '/g/', name: 'Technology', threads: '379' }],
            threads: [],
        });
        const user = userEvent.setup();

        render(<Search {...searchProps()} />);
        await user.type(
            screen.getByRole('combobox', {
                name: /search boards and threads/i,
            }),
            'g',
        );

        await waitFor(() =>
            expect(fetchMock).toHaveBeenCalledWith(
                '/search/suggest?q=g',
                expect.anything(),
            ),
        );
        expect(await screen.findByText('Technology')).toBeInTheDocument();
    });

    it('runs the search when a recent term is pressed', async () => {
        mockFetch();
        rememberSearch('init systems');
        const user = userEvent.setup();

        render(<Search {...searchProps()} />);
        await user.click(screen.getByRole('option', { name: 'init systems' }));

        expect(router.visit).toHaveBeenCalledWith('/search?q=init%20systems');
    });

    it('goes straight to a board when it is pressed', async () => {
        mockFetch();
        const user = userEvent.setup();

        render(<Search {...searchProps()} />);
        await user.click(screen.getByRole('option', { name: /Video Games/ }));

        expect(
            screen.getByRole('option', { name: /Video Games/ }),
        ).toHaveAttribute('href', '/v');
    });

    it('goes straight to a thread when it is pressed', async () => {
        const fetchMock = mockFetch({
            boards: [],
            threads: [
                makeThread({
                    no: 58210441,
                    board: '/g/',
                    title: 'RISC-V laptops',
                }),
            ],
        });
        const user = userEvent.setup();

        render(<Search {...searchProps()} />);
        await user.type(
            screen.getByRole('combobox', {
                name: /search boards and threads/i,
            }),
            'risc',
        );

        await waitFor(() => expect(fetchMock).toHaveBeenCalled());

        expect(
            await screen.findByRole('option', { name: /RISC-V laptops/ }),
        ).toHaveAttribute('href', '/g/58210441');
    });

    it('submits on Enter, exactly as the header field does', async () => {
        mockFetch();
        const user = userEvent.setup();

        render(<Search {...searchProps()} />);
        await user.type(
            screen.getByRole('combobox', {
                name: /search boards and threads/i,
            }),
            'init systems{Enter}',
        );

        expect(router.visit).toHaveBeenCalledWith('/search?q=init%20systems');
    });
});

describe('Search — at `md` and up, unchanged', () => {
    it('still shows "Nothing searched yet" for an empty query', () => {
        mockFetch();
        render(<Search {...searchProps()} />);

        expect(
            screen.getByRole('heading', { name: 'Nothing searched yet' }),
        ).toBeInTheDocument();
    });

    it('still renders results for a real query', () => {
        mockFetch();
        const boards = [makeBoard({ slug: '/g/', name: 'Technology' })];

        render(<Search {...searchProps({ query: 'g', boards })} />);

        expect(
            screen.getByRole('heading', { name: 'Results for "g"' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Technology')).toBeInTheDocument();
    });

    /**
     * The app bar is not conditional on the query: `AppHeader` hides itself
     * below `md` for `/search` *and* `/search?q=...` alike (it matches by
     * pathname), so a query-only app bar would strand a phone anon on the
     * results page with no back control, no hamburger and no field at all.
     */
    it('still renders the back control and field below `md` when there is a real query', () => {
        mockFetch();
        render(<Search {...searchProps({ query: 'g' })} />);

        const back = screen.getByRole('button', { name: /back/i });
        expect(back.closest('[class*="md:hidden"]')).not.toBeNull();
    });
});
