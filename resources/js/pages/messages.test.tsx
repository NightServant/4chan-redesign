import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CONVERSATIONS } from '@/fixtures/clover';
import Messages from '@/pages/messages';

/**
 * `Head` needs an Inertia app context this test does not have, and the page
 * renders no `Link` of its own. Mirrors the double the other page tests use.
 */
vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({ href, children }: { href: string; children: ReactNode }) => (
        <a href={href}>{children}</a>
    ),
}));

describe('Messages page', () => {
    it('renders the inbox under a single page heading', () => {
        render(<Messages />);

        expect(
            screen.getByRole('heading', { level: 1, name: 'Messages' }),
        ).toBeInTheDocument();
        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    });

    it('lists every conversation in the fixture', () => {
        render(<Messages />);

        expect(screen.getAllByRole('button', { name: /^anon_/ })).toHaveLength(
            CONVERSATIONS.length,
        );
    });
});
