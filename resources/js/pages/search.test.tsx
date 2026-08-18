import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import {
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { makeBoard, makeCommentResult, makeThread } from '@/fixtures/factories';
import { readSearchHistory, rememberSearch } from '@/lib/search-history';
import Search from '@/pages/search';

const { router, mockPage } = vi.hoisted(() => ({
    router: { visit: vi.fn(), post: vi.fn(), delete: vi.fn() },
    /**
     * Mutable, and signed out by default. The suggestions screen writes search
     * history only for a signed-in anon (task 13, fix 1), so this has to be a
     * fixture the tests can move rather than a frozen `null`.
     */
    mockPage: {
        props: { auth: { user: null as { id: number } | null } },
        url: '/search',
    },
}));

/** Enough of a user for `Boolean(auth.user)`, which is all the page reads. */
const SIGNED_IN = { id: 7 };

vi.mock('@inertiajs/react', () => ({
    router,
    Head: () => null,
    usePage: () => mockPage,
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

/* The other half of the suggestions screen: what an anon might read, beside
   where they might go. Ranked by replies, which is the only measure this
   application counts. */
const BUSIEST_THREADS = [
    makeThread({ title: 'Anons are still arguing about init systems' }),
    makeThread({ title: 'Mainline kernel support or vendor tree' }),
];

function searchProps(overrides: Partial<Parameters<typeof Search>[0]> = {}) {
    return {
        query: '',
        type: 'all' as const,
        sort: 'relevant' as const,
        time: 'all' as const,
        boards: [],
        threads: [],
        comments: [],
        busiestBoards: BUSIEST_BOARDS,
        busiestThreads: BUSIEST_THREADS,
        ...overrides,
    };
}

/** Radix's menu needs these; jsdom has none of them. */
beforeAll(() => {
    Element.prototype.hasPointerCapture = () => false;
    Element.prototype.setPointerCapture = () => {};
    Element.prototype.releasePointerCapture = () => {};
    Element.prototype.scrollIntoView = () => {};
});

beforeEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    router.visit.mockClear();
    mockPage.props.auth.user = null;
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

    /**
     * Task 13, fix 1, on the second of `runSearch`'s two callers. This screen
     * is the one that shows the history back, so a signed-out anon searching
     * here was the most visible half of the bug.
     */
    it('records no history for a signed-out anon', async () => {
        mockFetch();
        const user = userEvent.setup();

        render(<Search {...searchProps()} />);
        await user.type(
            screen.getByRole('combobox', {
                name: /search boards and threads/i,
            }),
            'init systems{Enter}',
        );

        expect(readSearchHistory()).toEqual([]);
        expect(router.visit).toHaveBeenCalledWith('/search?q=init%20systems');
    });

    it('records history for a signed-in anon', async () => {
        mockFetch();
        mockPage.props.auth.user = SIGNED_IN;
        const user = userEvent.setup();

        render(<Search {...searchProps()} />);
        await user.type(
            screen.getByRole('combobox', {
                name: /search boards and threads/i,
            }),
            'init systems{Enter}',
        );

        expect(readSearchHistory()).toEqual(['init systems']);
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

describe('Search — the tabs and the two dropdowns, at every width', () => {
    /** Task 7 is a feature at every width, not a small-screen fix. */
    it('renders the tab row outside the below-`md` app bar', () => {
        mockFetch();
        render(<Search {...searchProps({ query: 'risc' })} />);

        const tabs = screen.getByRole('navigation', {
            name: /search results/i,
        });

        expect(tabs.closest('[class*="md:hidden"]')).toBeNull();
        expect(
            within(tabs).getByRole('link', { name: 'Communities' }),
        ).toHaveAttribute('href', '/search?q=risc&type=communities');
    });

    it('renders both dropdowns reading as their current value', () => {
        mockFetch();
        render(
            <Search
                {...searchProps({
                    query: 'risc',
                    sort: 'latest',
                    time: 'week',
                })}
            />,
        );

        expect(
            screen.getByRole('button', { name: /sort by/i }),
        ).toHaveTextContent('Latest');
        expect(screen.getByRole('button', { name: /time/i })).toHaveTextContent(
            'This week',
        );
    });

    it('visits a new URL when a sort is chosen, keeping the query and the tab', async () => {
        mockFetch();
        const user = userEvent.setup();

        render(<Search {...searchProps({ query: 'risc', type: 'posts' })} />);

        await user.click(screen.getByRole('button', { name: /sort by/i }));
        await user.click(
            await screen.findByRole('menuitemradio', { name: 'Most replies' }),
        );

        expect(router.visit).toHaveBeenCalledWith(
            '/search?q=risc&type=posts&sort=replies',
        );
    });

    it('visits a new URL when a time window is chosen', async () => {
        mockFetch();
        const user = userEvent.setup();

        render(<Search {...searchProps({ query: 'risc' })} />);

        await user.click(screen.getByRole('button', { name: /time/i }));
        await user.click(
            await screen.findByRole('menuitemradio', { name: 'This week' }),
        );

        expect(router.visit).toHaveBeenCalledWith('/search?q=risc&time=week');
    });

    /** Clover has no votes, so Reddit's Top has no source and no alias. */
    it('offers exactly three sorts and nothing resembling Top', async () => {
        mockFetch();
        const user = userEvent.setup();

        render(<Search {...searchProps({ query: 'risc' })} />);
        await user.click(screen.getByRole('button', { name: /sort by/i }));

        const options = (await screen.findAllByRole('menuitemradio')).map(
            (option) => option.textContent,
        );

        expect(options).toEqual(['Relevance', 'Latest', 'Most replies']);
    });

    it.each(['comments', 'communities'] as const)(
        'drops most replies from the menu on the %s tab',
        async (type) => {
            mockFetch();
            const user = userEvent.setup();

            render(<Search {...searchProps({ query: 'risc', type })} />);
            await user.click(screen.getByRole('button', { name: /sort by/i }));

            expect(await screen.findAllByRole('menuitemradio')).toHaveLength(2);
            expect(
                screen.queryByRole('menuitemradio', { name: 'Most replies' }),
            ).not.toBeInTheDocument();
        },
    );

    /**
     * A board's `created_at` is when this mirror first saw it. Filtering
     * communities by it would be a control that filters on nothing an anon
     * can reason about, so it is not on screen at all.
     */
    it('hides the time control entirely on the communities tab', () => {
        mockFetch();
        render(
            <Search {...searchProps({ query: 'risc', type: 'communities' })} />,
        );

        expect(
            screen.queryByRole('button', { name: /time/i }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /sort by/i }),
        ).toBeInTheDocument();
    });

    it('shows no tabs or dropdowns on the suggestions screen, where there is nothing to filter', () => {
        mockFetch();
        render(<Search {...searchProps()} />);

        expect(
            screen.queryByRole('navigation', { name: /search results/i }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /sort by/i }),
        ).not.toBeInTheDocument();
    });
});

describe('Search — the results themselves', () => {
    it('renders replies on the comments tab', () => {
        mockFetch();

        render(
            <Search
                {...searchProps({
                    query: 'risc',
                    type: 'comments',
                    comments: [
                        makeCommentResult({
                            board: '/g/',
                            threadNo: 58210441,
                            no: 58210500,
                            threadTitle: 'RISC-V laptops',
                            body: 'The toolchain is the hard part.',
                        }),
                    ],
                })}
            />,
        );

        expect(
            screen.getByRole('link', { name: /RISC-V laptops/ }),
        ).toHaveAttribute('href', '/g/58210441#p58210500');
        expect(
            screen.getByText('The toolchain is the hard part.'),
        ).toBeInTheDocument();
    });

    /**
     * Each section of the All tab heads itself and leads to its own tab,
     * which is how the reference links the two.
     */
    it('heads each section on the all tab with a link to that tab', () => {
        mockFetch();

        render(
            <Search
                {...searchProps({
                    query: 'risc',
                    boards: [makeBoard({ slug: '/g/', name: 'Technology' })],
                    threads: [makeThread({ title: 'RISC-V laptops' })],
                    comments: [makeCommentResult()],
                })}
            />,
        );

        expect(screen.getByRole('link', { name: 'All posts' })).toHaveAttribute(
            'href',
            '/search?q=risc&type=posts',
        );
        expect(
            screen.getByRole('link', { name: 'All communities' }),
        ).toHaveAttribute('href', '/search?q=risc&type=communities');
        expect(
            screen.getByRole('link', { name: 'All comments' }),
        ).toHaveAttribute('href', '/search?q=risc&type=comments');
    });

    /** One tab, one section: no heading offering to go where it already is. */
    it('does not head a single-tab result list with a link back to itself', () => {
        mockFetch();

        render(
            <Search
                {...searchProps({
                    query: 'risc',
                    type: 'posts',
                    threads: [makeThread({ title: 'RISC-V laptops' })],
                })}
            />,
        );

        expect(
            screen.queryByRole('link', { name: 'All posts' }),
        ).not.toBeInTheDocument();
    });

    /**
     * The reference carries an AI answer block and upvote counts. Clover
     * summarises nothing and counts no votes, so neither is built.
     */
    it('invents no summary and no score', () => {
        mockFetch();

        render(
            <Search
                {...searchProps({
                    query: 'risc',
                    threads: [makeThread({ title: 'RISC-V laptops' })],
                    comments: [makeCommentResult()],
                })}
            />,
        );

        for (const invented of [
            /what people are saying/i,
            /see answer/i,
            /upvote/i,
        ]) {
            expect(screen.queryByText(invented)).not.toBeInTheDocument();
        }
    });
});

describe('Search — clearing the field', () => {
    it('offers no clear control while the field is empty', () => {
        mockFetch();
        render(<Search {...searchProps()} />);

        expect(
            screen.queryByRole('button', { name: /clear search/i }),
        ).not.toBeInTheDocument();
    });

    it('empties the field and returns to suggestions without running a search', async () => {
        mockFetch();
        const user = userEvent.setup();

        render(
            <Search
                {...searchProps({
                    query: 'risc',
                    threads: [makeThread({ title: 'RISC-V laptops' })],
                })}
            />,
        );

        const field = screen.getByRole('combobox', {
            name: /search boards and threads/i,
        });
        expect(field).toHaveValue('risc');

        await user.click(screen.getByRole('button', { name: /clear search/i }));

        expect(field).toHaveValue('');
        expect(router.visit).not.toHaveBeenCalled();

        /* Back to the suggestions this screen opens with. */
        expect(screen.getByText('Video Games')).toBeInTheDocument();
        expect(field).toHaveFocus();
    });
});
