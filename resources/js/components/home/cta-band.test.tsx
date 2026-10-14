import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CtaBand } from '@/components/home/cta-band';

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

describe('CtaBand', () => {
    it('is the last band, named by its invitation', () => {
        const { container } = render(<CtaBand />);

        expect(
            screen.getByRole('region', { name: 'Start reading' }),
        ).toBeInTheDocument();
        expect(container.querySelector('section#cta')).toBeInTheDocument();
    });

    it('says reading needs no account and replying does', () => {
        render(<CtaBand />);

        expect(
            screen.getByText(
                'Reading needs no account. Make one when you want to reply.',
            ),
        ).toBeInTheDocument();
    });

    /**
     * One door, the same as the hero's: browsing the popular feed without an
     * account.
     */
    it('offers one button, into the feed, with no account', () => {
        render(<CtaBand />);

        const links = screen.getAllByRole('link');

        expect(links).toHaveLength(1);
        expect(links[0]).toHaveTextContent('Browse without an account');
        expect(links[0]).toHaveAttribute('href', '/popular');
    });

    /**
     * Green is the accent and never a large fill. The band sits on the same
     * paper as every other, and only the button carries the colour.
     */
    it('does not fill the band with colour', () => {
        const { container } = render(<CtaBand />);

        expect(container.querySelector('section')?.className).not.toMatch(
            /\bbg-(primary|success|green)/,
        );
    });
});
