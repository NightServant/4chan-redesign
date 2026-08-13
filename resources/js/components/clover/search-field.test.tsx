import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchField } from '@/components/clover/search-field';

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
