import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AuthBrandPanel } from '@/components/auth/auth-brand-panel';
import { FOOTER_LINKS } from '@/lib/navigation';

vi.mock('@inertiajs/react', () => ({
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

describe('AuthBrandPanel', () => {
    it('says what an account actually carries', () => {
        render(<AuthBrandPanel />);

        expect(
            screen.getByText(/Posts stay anonymous/, { exact: false }),
        ).toBeInTheDocument();
    });

    it('lists the three account guarantees', () => {
        render(<AuthBrandPanel />);

        expect(screen.getByText('Anonymous by default')).toBeInTheDocument();
        expect(
            screen.getByText('Your boards travel with you'),
        ).toBeInTheDocument();
        expect(
            screen.getByText("Nothing kept you don't ask for"),
        ).toBeInTheDocument();
    });

    /**
     * The panel shipped dead links once before on this project. Every footer
     * entry comes from `FOOTER_LINKS`, so this fails the moment the panel
     * hand-writes its own list again.
     */
    it('points every footer entry at its real route', () => {
        render(<AuthBrandPanel />);

        for (const link of FOOTER_LINKS) {
            expect(
                screen.getByRole('link', { name: link.title }),
            ).toHaveAttribute('href', link.href);
        }
    });

    /**
     * The card owns the page's only `h1`. A heading here would either compete
     * with it or, since the panel is hidden below `lg`, vanish on mobile and
     * leave the document with a heading level that appears and disappears by
     * viewport.
     */
    it('contributes no headings to the document', () => {
        render(<AuthBrandPanel />);

        expect(screen.queryAllByRole('heading')).toHaveLength(0);
    });

    it('keeps the oversized decorative mark out of the accessibility tree', () => {
        const { container } = render(<AuthBrandPanel />);

        const decorations = container.querySelectorAll(
            '[data-slot="auth-brand-decoration"]',
        );

        expect(decorations.length).toBeGreaterThan(0);

        for (const decoration of decorations) {
            expect(decoration).toHaveAttribute('aria-hidden', 'true');
        }
    });
});
