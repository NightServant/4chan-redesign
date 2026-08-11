import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuthStatus } from '@/components/auth/auth-status';

describe('AuthStatus', () => {
    it('announces the message it carries', () => {
        render(<AuthStatus>A reset link is on its way.</AuthStatus>);

        expect(screen.getByRole('status')).toHaveTextContent(
            'A reset link is on its way.',
        );
    });

    /**
     * The one case where asserting a class is worth it: `text-green-600` was
     * what this replaced, and `css: false` means nothing else in the suite can
     * tell the two apart.
     */
    it('uses the Clover success token rather than a raw palette green', () => {
        render(<AuthStatus>Done.</AuthStatus>);

        expect(screen.getByRole('status')).toHaveClass('text-success');
    });
});
