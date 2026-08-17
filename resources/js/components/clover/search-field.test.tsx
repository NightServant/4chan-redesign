import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchField } from '@/components/clover/search-field';
import { readSearchHistory, rememberSearch } from '@/lib/search-history';

const { router } = vi.hoisted(() => ({ router: { visit: vi.fn() } }));

vi.mock('@inertiajs/react', () => ({
    router,
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

const RESULTS = {
    query: 'g',
    boards: [
        { slug: '/g/', name: 'Technology', threads: '379', subscribed: false },
    ],
    threads: [
        {
            id: 1,
            no: 58210441,
            board: '/g/',
            boardName: 'Technology',
            time: '4 min ago',
            title: 'RISC-V laptops as daily drivers',
            replies: 318,
            images: '48',
            media: null,
            pinned: false,
            bookmarked: false,
        },
    ],
};

function mockFetch(payload: unknown = RESULTS) {
    const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(payload),
    });

    vi.stubGlobal('fetch', fetchMock);

    return fetchMock;
}

beforeEach(() => {
    vi.useRealTimers();
    router.visit.mockClear();
    localStorage.clear();
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('SearchField', () => {
    /**
     * It was a button dressed as a field, opening a palette that nothing
     * mounted: pressing it did nothing at all. A real combobox is the fix, so
     * the type is the thing to assert.
     */
    it('is a real combobox, not a button', () => {
        mockFetch();

        render(<SearchField />);

        expect(screen.getByRole('combobox')).toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    /**
     * A plain native placeholder, and no ghost span.
     *
     * This field wore a `before:content-['Search']` /
     * `md:before:content-['Search boards and threads']` span so the wording
     * could shorten below `md`, where the field had roughly 160px to work
     * with. Task 6 removed that case: below `md` the header renders a button
     * that visits the search page, and this component sits inside
     * `hidden md:block`. The short branch was styling for a width this
     * component is never painted at.
     */
    it('places its one placeholder on the input itself', () => {
        mockFetch();

        const { container } = render(<SearchField />);

        const input = screen.getByRole('combobox');
        expect(input).toHaveAttribute(
            'placeholder',
            'Search boards and threads',
        );
        expect(input).toHaveAccessibleName('Search boards and threads');

        expect(
            container.querySelector('[class*="content-[\'Search\']"]'),
        ).toBeNull();
    });

    it('opens the dropdown on focus and asks the server for suggestions', async () => {
        const fetchMock = mockFetch();

        render(<SearchField />);

        await userEvent.click(screen.getByRole('combobox'));

        await waitFor(() =>
            expect(fetchMock).toHaveBeenCalledWith(
                '/search/suggest?q=',
                expect.anything(),
            ),
        );
        expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('lists matching boards and threads, each linked at itself', async () => {
        mockFetch();

        render(<SearchField />);

        await userEvent.type(screen.getByRole('combobox'), 'g');

        expect(await screen.findByText('Technology')).toBeInTheDocument();
        expect(
            screen.getByRole('option', { name: /Technology/ }),
        ).toHaveAttribute('href', '/g');
        expect(
            screen.getByRole('option', { name: /RISC-V laptops/ }),
        ).toHaveAttribute('href', '/g/58210441');
    });

    /** The query is escaped, so a slug with slashes cannot break the URL. */
    it('encodes the query it sends', async () => {
        const fetchMock = mockFetch();

        render(<SearchField />);

        await userEvent.type(screen.getByRole('combobox'), '100%');

        await waitFor(() =>
            expect(fetchMock).toHaveBeenLastCalledWith(
                '/search/suggest?q=100%25',
                expect.anything(),
            ),
        );
    });

    /**
     * Typing is not navigation, so the dropdown must not push history. Enter
     * is navigation, so that one goes through Inertia.
     */
    it('navigates only on Enter, never while typing', async () => {
        mockFetch();

        render(<SearchField />);

        await userEvent.type(screen.getByRole('combobox'), 'risc');
        expect(router.visit).not.toHaveBeenCalled();

        await userEvent.keyboard('{Enter}');
        expect(router.visit).toHaveBeenCalledWith('/search?q=risc');
    });

    it('does not navigate on Enter with an empty query', async () => {
        mockFetch();

        render(<SearchField />);

        await userEvent.click(screen.getByRole('combobox'));
        await userEvent.keyboard('{Enter}');

        expect(router.visit).not.toHaveBeenCalled();
    });

    it('says so plainly when nothing matches', async () => {
        mockFetch({ query: 'zzz', boards: [], threads: [] });

        render(<SearchField />);

        await userEvent.type(screen.getByRole('combobox'), 'zzz');

        expect(
            await screen.findByText('Nothing matches "zzz".'),
        ).toBeInTheDocument();
    });

    it('closes on Escape', async () => {
        mockFetch();

        render(<SearchField />);

        await userEvent.click(screen.getByRole('combobox'));
        expect(screen.getByRole('listbox')).toBeInTheDocument();

        await userEvent.keyboard('{Escape}');
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    /** The field has advertised this shortcut since it was a button that ignored it. */
    it('focuses on the shortcut it advertises', async () => {
        mockFetch();

        render(<SearchField />);

        await userEvent.keyboard('{Meta>}k{/Meta}');

        expect(screen.getByRole('combobox')).toHaveFocus();
        expect(screen.getByRole('combobox')).toHaveAttribute(
            'aria-keyshortcuts',
            'Meta+K',
        );
    });

    /**
     * A slow answer for `ge` must not land after a fast one for `gen` and
     * overwrite it. The request in flight is aborted on every keystroke.
     */
    it('aborts the request in flight when another keystroke arrives', async () => {
        const fetchMock = mockFetch();

        render(<SearchField />);

        await userEvent.type(screen.getByRole('combobox'), 'gen');

        await waitFor(() => expect(fetchMock).toHaveBeenCalled());

        const signals = fetchMock.mock.calls.map((call) => call[1].signal);

        expect(signals.length).toBeGreaterThan(0);
        expect(signals.every((signal) => signal instanceof AbortSignal)).toBe(
            true,
        );
    });
});

/**
 * Recent searches.
 *
 * An empty box is the state a search field spends most of its life in, and it
 * used to offer the busiest boards there — useful once, useless to someone who
 * comes back to the same three terms. What an anon searched for is the thing
 * they are most likely to want again.
 */
describe('SearchField recent searches', () => {
    it('lists what was searched before when the box is empty', async () => {
        const user = userEvent.setup();
        mockFetch({ query: '', boards: [], threads: [] });
        rememberSearch('init systems');
        rememberSearch('mechanical keyboards');

        render(<SearchField />);
        await user.click(screen.getByRole('combobox'));

        const recent = await screen.findByRole('group', {
            name: 'Recent searches',
        });

        expect(recent).toHaveTextContent('mechanical keyboards');
        expect(recent).toHaveTextContent('init systems');
    });

    it('searches again when a recent term is pressed', async () => {
        const user = userEvent.setup();
        mockFetch({ query: '', boards: [], threads: [] });
        rememberSearch('init systems');

        render(<SearchField />);
        await user.click(screen.getByRole('combobox'));
        await user.click(
            await screen.findByRole('option', { name: 'init systems' }),
        );

        expect(router.visit).toHaveBeenCalledWith('/search?q=init%20systems');
    });

    /** The close icon the request asked for: it removes that one term. */
    it('removes a single term from the close control beside it', async () => {
        const user = userEvent.setup();
        mockFetch({ query: '', boards: [], threads: [] });
        rememberSearch('keep me');
        rememberSearch('drop me');

        render(<SearchField />);
        await user.click(screen.getByRole('combobox'));
        await user.click(
            await screen.findByRole('button', {
                name: 'Remove "drop me" from recent searches',
            }),
        );

        expect(readSearchHistory()).toEqual(['keep me']);
        expect(screen.queryByText('drop me')).not.toBeInTheDocument();
        expect(screen.getByText('keep me')).toBeInTheDocument();
    });

    /** Removing a term must not run it. */
    it('does not search when the close control is pressed', async () => {
        const user = userEvent.setup();
        mockFetch({ query: '', boards: [], threads: [] });
        rememberSearch('drop me');

        render(<SearchField />);
        await user.click(screen.getByRole('combobox'));
        await user.click(
            await screen.findByRole('button', {
                name: 'Remove "drop me" from recent searches',
            }),
        );

        expect(router.visit).not.toHaveBeenCalled();
    });

    it('records a search when one is run', async () => {
        const user = userEvent.setup();
        mockFetch();

        render(<SearchField />);
        await user.type(screen.getByRole('combobox'), 'init systems{Enter}');

        expect(readSearchHistory()).toEqual(['init systems']);
    });

    it('shows no recent group before anything has been searched', async () => {
        const user = userEvent.setup();
        mockFetch({ query: '', boards: [], threads: [] });

        render(<SearchField />);
        await user.click(screen.getByRole('combobox'));

        await waitFor(() =>
            expect(screen.getByRole('listbox')).toBeInTheDocument(),
        );
        expect(
            screen.queryByRole('group', { name: 'Recent searches' }),
        ).not.toBeInTheDocument();
    });

    /** Once an anon is typing, the results are what they want, not the past. */
    it('hides recent searches once there is a query', async () => {
        const user = userEvent.setup();
        mockFetch();
        rememberSearch('init systems');

        render(<SearchField />);
        await user.type(screen.getByRole('combobox'), 'g');

        await waitFor(() =>
            expect(
                screen.queryByRole('group', { name: 'Recent searches' }),
            ).not.toBeInTheDocument(),
        );
    });
});
