import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import AuthSplitLayout from '@/layouts/auth/auth-split-layout';

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a>,
    usePage: () => ({ props: { auth: { user: null } } }),
}));

/**
 * The paper runs through the signed-in shell and the auth form, so a reader
 * who signs in does not arrive somewhere that looks like a different product.
 */
describe('layout paper', () => {
    it('draws the auth form side on patterned paper', () => {
        const { container } = render(
            <AuthSplitLayout title="Sign in" description="">
                <p>form</p>
            </AuthSplitLayout>,
        );

        expect(
            container.querySelector('main [data-slot="pattern-field-paper"]')
                ?.className,
        ).toMatch(/bg-dots/);
    });

    /**
     * The brand panel is deliberately left flat. Two patterned halves either
     * side of a hairline is one surface interrupted, and the point of the
     * split is that the two sides are different kinds of thing.
     */
    it('leaves the brand panel unpatterned', () => {
        const { container } = render(
            <AuthSplitLayout title="Sign in" description="">
                <p>form</p>
            </AuthSplitLayout>,
        );

        const panel = container.querySelector('[data-slot="auth-brand-panel"]');

        expect(
            panel?.querySelector('[data-slot="pattern-field-paper"]'),
        ).toBeNull();
    });
});
