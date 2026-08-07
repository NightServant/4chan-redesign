import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Mark, Wordmark } from '@/components/clover/wordmark';

describe('Wordmark', () => {
    it('renders the word "clover" in lowercase', () => {
        render(<Wordmark />);

        expect(screen.getByText('clover')).toBeInTheDocument();
    });

    it('hides the glyph from assistive technology, since the word already names it', () => {
        render(<Wordmark />);

        const glyph = document.querySelector('svg');

        expect(glyph).toHaveAttribute('aria-hidden', 'true');
    });

    it('renders the glyph at the given size', () => {
        render(<Wordmark size={24} />);

        const glyph = document.querySelector('svg');

        expect(glyph).toHaveAttribute('width', '24');
        expect(glyph).toHaveAttribute('height', '24');
    });

    it('does not render a link, leaving that to the caller', () => {
        render(<Wordmark />);

        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
});

describe('Mark', () => {
    it('exposes the accessible name supplied by its caller', () => {
        render(<Mark aria-label="Clover home" />);

        expect(
            screen.getByRole('img', { name: 'Clover home' }),
        ).toBeInTheDocument();
    });

    it('renders the glyph at the given size', () => {
        render(<Mark aria-label="Clover" size={32} />);

        const glyph = screen.getByRole('img', { name: 'Clover' });

        expect(glyph).toHaveAttribute('width', '32');
        expect(glyph).toHaveAttribute('height', '32');
    });

    it('does not render a link, leaving that to the caller', () => {
        render(<Mark aria-label="Clover" />);

        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
});
