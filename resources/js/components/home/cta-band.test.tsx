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
        expect(button.parentElement).toHaveClass('sm:justify-center');
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
     * Three actions in one deliberate order of weight: reading first and
     * filled, then the account actions, quieter. One primary only, so nothing
     * competes with the way in; all three the same 44px height.
     */
    it('offers browse, then create account, then log in, when signed out', () => {
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
        links.forEach((link) =>
            expect(link).toHaveClass('h-11', 'w-full', 'sm:w-auto'),
        );
        expect(links[0]).toHaveClass('bg-primary');
        expect(links[1]).toHaveClass('border');
        expect(links[1]).not.toHaveClass('bg-primary');
        expect(links[2]).toHaveClass('bg-transparent');
        expect(links[2]).not.toHaveClass('border');
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
     * A phone stacks the three at one width, in the same order, rather than
     * wrapping a row into uneven lines; from `sm` up they share one centred
     * row.
     */
    it('stacks the buttons at one width on a phone and rows them from `sm`', () => {
        render(<CtaBand />);

        const group = screen.getByRole('link', {
            name: 'Browse without an account',
        }).parentElement;

        expect(group).toHaveClass(
            'flex-col',
            'w-full',
            'max-w-xs',
            'sm:flex-row',
            'sm:justify-center',
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
