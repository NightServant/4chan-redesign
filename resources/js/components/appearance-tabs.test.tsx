import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AppearanceTabs from '@/components/appearance-tabs';

/**
 * The hook writes a cookie the server reads back through `HandleAppearance`,
 * so the contract under test is that each control still calls it with one of
 * the three stored values. Mocking it keeps that assertion exact.
 */
const { useAppearance, updateAppearance } = vi.hoisted(() => ({
    useAppearance: vi.fn(),
    updateAppearance: vi.fn(),
}));

vi.mock('@/hooks/use-appearance', () => ({ useAppearance }));

function mockAppearance(appearance: 'light' | 'dark' | 'system'): void {
    useAppearance.mockReturnValue({
        appearance,
        resolvedAppearance: appearance === 'light' ? 'light' : 'dark',
        updateAppearance,
    });
}

beforeEach(() => {
    updateAppearance.mockClear();
    mockAppearance('dark');
});

describe('AppearanceTabs', () => {
    it('renders the three theme choices in a labelled group', () => {
        render(<AppearanceTabs />);

        const group = screen.getByRole('group', { name: 'Theme' });

        expect(group).toBeInTheDocument();
        expect(screen.getAllByRole('button')).toHaveLength(3);
    });

    it('reports the stored theme through aria-pressed', () => {
        render(<AppearanceTabs />);

        expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        expect(screen.getByRole('button', { name: 'Light' })).toHaveAttribute(
            'aria-pressed',
            'false',
        );
    });

    it('moves the pressed state when the stored theme changes', () => {
        mockAppearance('system');

        render(<AppearanceTabs />);

        expect(screen.getByRole('button', { name: 'System' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
    });

    it.each([
        ['Light', 'light'],
        ['Dark', 'dark'],
        ['System', 'system'],
    ])('stores %s as %s', async (label, value) => {
        const user = userEvent.setup();

        render(<AppearanceTabs />);

        await user.click(screen.getByRole('button', { name: label }));

        expect(updateAppearance).toHaveBeenCalledWith(value);
    });

    it('is reachable and operable from the keyboard', async () => {
        const user = userEvent.setup();

        render(<AppearanceTabs />);

        await user.tab();
        expect(screen.getByRole('button', { name: 'Light' })).toHaveFocus();

        await user.keyboard('{Enter}');
        expect(updateAppearance).toHaveBeenCalledWith('light');
    });

    it('tints only the selected control with the one green', () => {
        render(<AppearanceTabs />);

        expect(
            screen.getByRole('button', { name: 'Dark' }).className,
        ).toContain('bg-primary-soft');
        expect(
            screen.getByRole('button', { name: 'Light' }).className,
        ).not.toContain('bg-primary-soft');
    });
});
