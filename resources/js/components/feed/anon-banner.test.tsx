import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AnonBanner } from '@/components/feed/anon-banner';

/**
 * `Link` is replaced with a plain anchor so the DOM stays queryable by role
 * without a real Inertia router context. See `thread-card.test.tsx` for the
 * same pattern.
 */
vi.mock('@inertiajs/react', () => ({
    Link: ({
        href,
        children,
        ...props
    }: {
        href: string | { url: string };
        children: ReactNode;
    } & Record<string, unknown>) => {
        const url = typeof href === 'string' ? href : href.url;

        return (
            <a href={url} {...props}>
                {children}
            </a>
        );
    },
}));

describe('AnonBanner', () => {
    it('states the anonymous-browsing copy verbatim', () => {
        render(<AnonBanner />);

        expect(
            screen.getByText(
                'You are reading anonymously. Anyone can read; replying needs an account. Threads themselves come from 4chan, so new ones start there.',
            ),
        ).toBeInTheDocument();
    });

    it('never uses an em dash or a double hyphen in its copy', () => {
        const { container } = render(<AnonBanner />);

        expect(container.textContent).not.toMatch(/—|--/);
    });

    /**
     * The header carries both controls on every screen a signed-out anon can
     * reach, including this one, two inches above the banner. A banner that
     * repeats the chrome directly beneath it asks the same question twice.
     */
    it('offers no sign-in controls the header already carries', () => {
        render(<AnonBanner />);

        expect(screen.queryByRole('link')).not.toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
});
