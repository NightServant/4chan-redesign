import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import AuthSplitLayout from '@/layouts/auth/auth-split-layout';

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

describe('AuthSplitLayout', () => {
    it('renders the page title as the only first-level heading', () => {
        render(
            <AuthSplitLayout
                title="Welcome back"
                description="Sign in to continue your Clover experience."
            >
                <p>form</p>
            </AuthSplitLayout>,
        );

        const headings = screen.getAllByRole('heading', { level: 1 });

        expect(headings).toHaveLength(1);
        expect(headings[0]).toHaveTextContent('Welcome back');
    });

    it('puts the form inside the main landmark', () => {
        render(
            <AuthSplitLayout title="Welcome back">
                <button type="button">Sign in</button>
            </AuthSplitLayout>,
        );

        expect(
            within(screen.getByRole('main')).getByRole('button', {
                name: 'Sign in',
            }),
        ).toBeInTheDocument();
    });

    it('keeps the brand panel beside the card', () => {
        render(
            <AuthSplitLayout title="Welcome back">
                <p>form</p>
            </AuthSplitLayout>,
        );

        expect(screen.getByText('Anonymous by default')).toBeInTheDocument();
    });

    /**
     * The starter kit shipped `bg-zinc-900`, `text-white` and `text-black`
     * here, which is the whole reason this file was rewritten. A grep is
     * blunt, but `css: false` means no rendered test can see a colour.
     */
    it('leaves no raw Tailwind palette colour in the auth chrome', async () => {
        const { readFileSync } = await import('node:fs');
        const { join } = await import('node:path');

        const sources = [
            'resources/js/layouts/auth/auth-split-layout.tsx',
            'resources/js/layouts/auth-layout.tsx',
            'resources/js/components/auth/auth-brand-panel.tsx',
            'resources/js/components/auth/auth-card.tsx',
            'resources/js/components/auth/auth-input.tsx',
            'resources/js/components/auth/auth-link.tsx',
        ]
            .map((path) => readFileSync(join(process.cwd(), path), 'utf8'))
            // Comments legitimately name the classes they replaced.
            .map((source) =>
                source
                    .replace(/\/\*[\s\S]*?\*\//g, '')
                    .replace(/^\s*\/\/.*$/gm, ''),
            );

        const rawPalette =
            /\b(?:bg|text|border|decoration|ring|outline|fill)-(?:zinc|neutral|slate|gray|stone|red|green|blue|amber|yellow|emerald|white|black)\b/;

        for (const source of sources) {
            expect(source).not.toMatch(rawPalette);
        }
    });
});
