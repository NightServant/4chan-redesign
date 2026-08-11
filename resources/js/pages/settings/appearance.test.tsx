import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Appearance from '@/pages/settings/appearance';

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
}));

describe('Appearance settings', () => {
    it('never renders its own h1, because the layout supplies one', () => {
        render(<Appearance />);

        expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    });

    it('renders the theme region as a landmark', () => {
        render(<Appearance />);

        expect(
            screen.getByRole('region', { name: 'Theme' }),
        ).toBeInTheDocument();
    });

    it('offers the three theme choices', () => {
        render(<Appearance />);

        expect(
            screen.getByRole('button', { name: 'Light' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Dark' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'System' }),
        ).toBeInTheDocument();
    });
});
