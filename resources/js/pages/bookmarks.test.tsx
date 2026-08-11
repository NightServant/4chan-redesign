import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { BOOKMARKS } from '@/fixtures/clover';
import Bookmarks from '@/pages/bookmarks';

/**
 * Radix Select drives its listbox with pointer capture and scroll APIs jsdom
 * does not implement. Same stubs as `components/ui/select.test.tsx`.
 */
beforeAll(() => {
    Element.prototype.hasPointerCapture = () => false;
    Element.prototype.setPointerCapture = () => {};
    Element.prototype.releasePointerCapture = () => {};
    Element.prototype.scrollIntoView = () => {};
});

/**
 * `Head` and `Link` need an Inertia app context this test does not have.
 * `Link` renders a plain anchor so thread titles stay queryable by role.
 */
vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({
        href,
        children,
        ...props
    }: {
        href: string | { url: string };
        children: ReactNode;
    } & Record<string, unknown>) => (
        <a href={typeof href === 'string' ? href : href.url} {...props}>
            {children}
        </a>
    ),
}));

const KOLA = BOOKMARKS[0].thread.title;
const RISC_V = BOOKMARKS[1].thread.title;
const WALKING = BOOKMARKS[3].thread.title;

function savedTitles(): string[] {
    return within(screen.getByRole('list', { name: 'Saved threads' }))
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent ?? '');
}

describe('Bookmarks page', () => {
    it('counts the saved threads under a single page heading', () => {
        render(<Bookmarks />);

        expect(
            screen.getByRole('heading', { level: 1, name: 'Bookmarks' }),
        ).toBeInTheDocument();
        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
        expect(screen.getByText('4 saved threads')).toBeInTheDocument();
    });

    it('renders every saved thread with the date it was saved', () => {
        render(<Bookmarks />);

        expect(savedTitles()).toHaveLength(BOOKMARKS.length);
        expect(screen.getByText('Saved 2 days ago')).toBeInTheDocument();
    });

    it("marks the anon's own note as theirs, and omits it when unwritten", () => {
        render(<Bookmarks />);

        expect(screen.getAllByText('Your note')).toHaveLength(2);
        expect(
            screen.getByText(
                'Track four timestamp is 11:42, not 11:24 like the OP says.',
            ),
        ).toBeInTheDocument();

        const items = within(
            screen.getByRole('list', { name: 'Saved threads' }),
        ).getAllByRole('listitem');

        expect(within(items[1]).queryByText('Your note')).toBeNull();
    });

    it('filters on thread title', async () => {
        const user = userEvent.setup();
        render(<Bookmarks />);

        await user.type(screen.getByLabelText('Search bookmarks'), 'borehole');

        expect(savedTitles()).toEqual([KOLA]);
    });

    it('says what matched nothing', async () => {
        const user = userEvent.setup();
        render(<Bookmarks />);

        await user.type(screen.getByLabelText('Search bookmarks'), 'zzz');

        expect(
            screen.getByRole('heading', { name: 'No bookmarks match' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Nothing matches "zzz".')).toBeInTheDocument();
    });

    it('reorders by blessings when the sort changes', async () => {
        const user = userEvent.setup();
        render(<Bookmarks />);

        expect(savedTitles()[0]).toBe(KOLA);

        await user.click(
            screen.getByRole('combobox', { name: 'Sort bookmarks' }),
        );
        await user.click(screen.getByRole('option', { name: 'Most blessed' }));

        expect(savedTitles()[0]).toBe(WALKING);
    });

    it('removes a bookmark and recounts', async () => {
        const user = userEvent.setup();
        render(<Bookmarks />);

        await user.click(
            screen.getByRole('button', {
                name: `Remove bookmark: ${RISC_V}`,
            }),
        );

        expect(savedTitles()).toHaveLength(3);
        expect(savedTitles()).not.toContain(RISC_V);
        expect(screen.getByText('3 saved threads')).toBeInTheDocument();
    });

    it('states the absence plainly once nothing is saved', async () => {
        const user = userEvent.setup();
        render(<Bookmarks />);

        for (const bookmark of BOOKMARKS) {
            await user.click(
                screen.getByRole('button', {
                    name: `Remove bookmark: ${bookmark.thread.title}`,
                }),
            );
        }

        expect(
            screen.getByRole('heading', { name: 'No bookmarks' }),
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                'Threads you save appear here and stay until you remove them.',
            ),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Browse the feed' }),
        ).toBeInTheDocument();
    });
});
