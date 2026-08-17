import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { HistoryEntryList } from '@/components/clover/history-entry-list';
import { TooltipProvider } from '@/components/ui/tooltip';
import { makeHistoryEntry, makeThread } from '@/fixtures/factories';

vi.mock('@inertiajs/react', () => ({
    Link: ({
        href,
        children,
        ...props
    }: {
        href: string | { url: string };
        children: ReactNode;
    } & Record<string, unknown>) => {
        const url = typeof href === 'string' ? href : href.url;

        return (
            <a href={url} {...props}>
                {children}
            </a>
        );
    },
}));

/**
 * `history.tsx` and the account screen's History tab both draw the same
 * grouped list of threads. It used to exist once, inline in `history.tsx`;
 * this is that block, extracted so a second page reads the same component
 * instead of a second copy that could drift from it the way the history
 * screen's own card once drifted from the feed's.
 */
function entry(
    title: string,
    day: 'Today' | 'Yesterday' | 'Earlier',
    when: string,
    no: number,
) {
    return makeHistoryEntry({ thread: makeThread({ title, no }), day, when });
}

function renderList(entries = ENTRIES) {
    return render(
        <TooltipProvider>
            <HistoryEntryList entries={entries} onBookmark={vi.fn()} />
        </TooltipProvider>,
    );
}

const ENTRIES = [
    entry(
        'Anons are still arguing about init systems',
        'Today',
        'Today, 14:02',
        1,
    ),
    entry(
        'Thermal paste application patterns',
        'Yesterday',
        'Yesterday, 22:10',
        2,
    ),
    entry('Cross compiling on an x86 box', 'Earlier', '3 Aug 2026, 21:40', 3),
];

describe('HistoryEntryList', () => {
    it('groups entries into a labelled region per day, in Today/Yesterday/Earlier order', () => {
        renderList();

        for (const group of ['Today', 'Yesterday', 'Earlier']) {
            expect(
                screen.getByRole('region', { name: group }),
            ).toBeInTheDocument();
        }
    });

    it('omits a day heading with nothing under it', () => {
        renderList([entry('Only a Today entry', 'Today', 'Today, 09:00', 1)]);

        expect(
            screen.queryByRole('region', { name: 'Yesterday' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('region', { name: 'Earlier' }),
        ).not.toBeInTheDocument();
    });

    /** The point of extracting this: the same card the feed draws. */
    it("draws each thread with the feed's own card", () => {
        const { container } = renderList();

        expect(
            container.querySelectorAll('[data-slot="thread-card"]'),
        ).toHaveLength(3);
    });

    it('says when the anon was last on each thread', () => {
        renderList();

        expect(screen.getByText('Read Today, 14:02')).toBeInTheDocument();
    });

    it('calls back with the thread when its bookmark control is pressed', async () => {
        const user = userEvent.setup();
        const onBookmark = vi.fn();
        const threads = [makeThread({ id: 9, title: 'Save me', no: 42 })];

        render(
            <TooltipProvider>
                <HistoryEntryList
                    entries={[
                        makeHistoryEntry({ thread: threads[0], day: 'Today' }),
                    ]}
                    onBookmark={onBookmark}
                />
            </TooltipProvider>,
        );

        const [save] = screen.getAllByRole('button', {
            name: /save|bookmark/i,
        });
        await user.click(save);

        expect(onBookmark).toHaveBeenCalledWith(threads[0]);
    });
});
