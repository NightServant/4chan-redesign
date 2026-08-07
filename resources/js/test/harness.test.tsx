import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('test harness', () => {
    it('renders React components into a DOM', () => {
        render(<button type="button">Bless</button>);
        expect(
            screen.getByRole('button', { name: 'Bless' }),
        ).toBeInTheDocument();
    });
});
