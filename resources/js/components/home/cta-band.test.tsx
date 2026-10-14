import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CtaBand } from '@/components/home/cta-band';
import type { User } from '@/types/auth';

const mockPage: { props: { auth: { user: User | null } } } = {
    props: { auth: { user: null } },
};

vi.mock('@inertiajs/react', () => ({
    usePage: () => mockPage,
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

beforeEach(() => {
    mockPage.props = { auth: { user: null } };
});

describe('CtaBand', () => {
    it('centres its heading, sentence and button down the band', () => {
        render(<CtaBand />);

        const heading = screen.getByRole('heading', { name: 'Start reading' });
        const button = screen.getByRole('link', {
            name: 'Browse without an account',
        });

        expect(heading.parentElement).toHaveClass('items-center');
        expect(heading.parentElement?.parentElement).toHaveClass(
            'justify-center',
            'text-center',
        );
        expect(
            screen.getByText(
                'Reading needs no account. Make one when you want to reply.',
            ),
        ).toHaveClass('mx-auto');
        expect(button.parentElement).toHaveClass('mx-auto', 'grid');
    });

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
     * The way into the feed is the one filled button; the two account actions
     * are an outlined pair of equal weight. All three are the same 44px height.
     */
    it('offers browse, then create account and log in as an outlined pair, when signed out', () => {
        render(<CtaBand />);

        const links = screen.getAllByRole('link');

        expect(links.map((link) => link.textContent)).toEqual([
            'Browse without an account',
            'Create account',
            'Log in',
        ]);
        expect(links.map((link) => link.getAttribute('href'))).toEqual([
            '/popular',
            '/register',
            '/login',
        ]);
        links.forEach((link) => expect(link).toHaveClass('h-11', 'w-full'));
        expect(links[0]).toHaveClass('bg-primary');
        [links[1], links[2]].forEach((link) => {
            expect(link).toHaveClass('border', 'border-border-strong');
            expect(link).not.toHaveClass('bg-primary');
        });
    });

    it('offers only the way into the feed when signed in', () => {
        mockPage.props = {
            auth: { user: { id: 1, email: 'anon@example.com' } as User },
        };

        render(<CtaBand />);

        const links = screen.getAllByRole('link');

        expect(links).toHaveLength(1);
        expect(links[0]).toHaveTextContent('Browse without an account');
    });

    /**
     * One block: the primary spans both columns on top, the pair shares the
     * row beneath it at every width, so the three always read as one unit.
     */
    it('puts the primary alone on top and the pair side by side beneath it', () => {
        render(<CtaBand />);

        const primary = screen.getByRole('link', {
            name: 'Browse without an account',
        });

        expect(primary.parentElement).toHaveClass(
            'grid',
            'grid-cols-2',
            'max-w-xs',
            'sm:max-w-sm',
        );
        expect(primary).toHaveClass('col-span-2');
        expect(
            screen.getByRole('link', { name: 'Create account' }),
        ).not.toHaveClass('col-span-2');
        expect(screen.getByRole('link', { name: 'Log in' })).not.toHaveClass(
            'col-span-2',
        );
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
