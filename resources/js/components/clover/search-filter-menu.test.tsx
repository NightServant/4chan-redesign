import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { SearchFilterMenu } from '@/components/clover/search-filter-menu';

/**
 * Radix drives its menu with pointer capture and scroll APIs jsdom does not
 * implement, matching the stubs `dropdown-menu.test.tsx` already uses.
 */
beforeAll(() => {
    Element.prototype.hasPointerCapture = () => false;
    Element.prototype.setPointerCapture = () => {};
    Element.prototype.releasePointerCapture = () => {};
    Element.prototype.scrollIntoView = () => {};
});

const SORTS = [
    { value: 'relevant', label: 'Relevance' },
    { value: 'latest', label: 'Latest' },
    { value: 'replies', label: 'Most replies' },
] as const;

function renderMenu(
    overrides: Partial<Parameters<typeof SearchFilterMenu>[0]> = {},
) {
    const onSelect = vi.fn();

    render(
        <SearchFilterMenu
            name="Sort by"
            value="relevant"
            options={SORTS}
            onSelect={onSelect}
            {...overrides}
        />,
    );

    return { onSelect };
}

describe('SearchFilterMenu', () => {
    /** The trigger reads as the current value, not as the control's name. */
    it('shows the chosen option on the trigger', () => {
        renderMenu({ value: 'latest' });

        expect(
            screen.getByRole('button', { name: /sort by/i }),
        ).toHaveTextContent('Latest');
    });

    it('carries an accessible name beyond the value on it', () => {
        renderMenu();

        expect(
            screen.getByRole('button', { name: /sort by/i }),
        ).toBeInTheDocument();
    });

    it('opens on the keyboard and reports what is chosen', async () => {
        renderMenu({ value: 'latest' });

        await userEvent.tab();
        expect(screen.getByRole('button', { name: /sort by/i })).toHaveFocus();

        await userEvent.keyboard('{Enter}');

        const chosen = await screen.findByRole('menuitemradio', {
            name: 'Latest',
        });
        expect(chosen).toHaveAttribute('aria-checked', 'true');
    });

    it('reports the value chosen, once, and only when it changes', async () => {
        const { onSelect } = renderMenu();

        await userEvent.click(screen.getByRole('button', { name: /sort by/i }));
        await userEvent.click(
            await screen.findByRole('menuitemradio', { name: 'Most replies' }),
        );

        expect(onSelect).toHaveBeenCalledTimes(1);
        expect(onSelect).toHaveBeenCalledWith('replies');
    });

    it('offers only the options it is given', async () => {
        renderMenu({ options: SORTS.slice(0, 2) });

        await userEvent.click(screen.getByRole('button', { name: /sort by/i }));

        expect(await screen.findAllByRole('menuitemradio')).toHaveLength(2);
        expect(
            screen.queryByRole('menuitemradio', { name: 'Most replies' }),
        ).not.toBeInTheDocument();
    });
});
