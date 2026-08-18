import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppearanceRow } from '@/components/account/appearance-row';

/**
 * The theme control, on the one screen that carries it below `md`.
 *
 * It moved off the header in the mobile-shell work, so this row is the only
 * way to change the theme on a phone. It shipped asserted only to *exist*:
 * replacing its `onSelect` with a no-op left all 1277 tests green, which is
 * this codebase's recurring defect -- a control that looks right and does
 * nothing.
 */
vi.mock('@/hooks/use-appearance', () => ({
    useAppearance: () => ({
        appearance: currentAppearance,
        resolvedAppearance: currentAppearance === 'dark' ? 'dark' : 'light',
        updateAppearance,
    }),
}));

let currentAppearance: 'light' | 'dark' | 'system' = 'system';
const updateAppearance = vi.fn();

/** Radix's menu needs pointer APIs jsdom does not implement. */
beforeAll(() => {
    Element.prototype.hasPointerCapture = () => false;
    Element.prototype.setPointerCapture = () => {};
    Element.prototype.releasePointerCapture = () => {};
    Element.prototype.scrollIntoView = () => {};
});

beforeEach(() => {
    currentAppearance = 'system';
    updateAppearance.mockClear();
});

describe('AppearanceRow', () => {
    it('writes the theme an anon picks', async () => {
        const user = userEvent.setup();

        render(<AppearanceRow />);

        await user.click(screen.getByRole('button', { name: 'System' }));
        await user.click(await screen.findByRole('menuitem', { name: 'Dark' }));

        expect(updateAppearance).toHaveBeenCalledWith('dark');
    });

    it('offers all three, since `system` is what an anon starts on', async () => {
        const user = userEvent.setup();

        render(<AppearanceRow />);

        await user.click(screen.getByRole('button', { name: 'System' }));

        const options = (await screen.findAllByRole('menuitem')).map(
            (item) => item.textContent,
        );

        expect(options).toEqual(['Light', 'Dark', 'System']);
    });

    /** The trigger reads as the current value, matching the search filters. */
    it('names the current theme rather than the control', () => {
        currentAppearance = 'dark';

        render(<AppearanceRow />);

        expect(
            screen.getByRole('button', { name: 'Dark' }),
        ).toBeInTheDocument();
    });
});
