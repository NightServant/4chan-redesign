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
    it('reads left to right, heading and sentence included', () => {
        render(<CtaBand boardCount={53} />);

        const heading = screen.getByRole('heading', { name: 'Start reading' });

        expect(heading.parentElement).not.toHaveClass('items-center');
        expect(heading.parentElement?.parentElement).not.toHaveClass(
            'text-center',
        );
    });

    it('is the last band, named by its invitation', () => {
        const { container } = render(<CtaBand boardCount={53} />);

        expect(
            screen.getByRole('region', { name: 'Start reading' }),
        ).toBeInTheDocument();
        expect(container.querySelector('section#cta')).toBeInTheDocument();
    });

    it('says reading needs no account and replying does', () => {
        render(<CtaBand boardCount={53} />);

        expect(
            screen.getByText(
                'Reading needs no account. Make one when you want to reply.',
            ),
        ).toBeInTheDocument();
    });

    /**
     * Signed out the account pair leads, Log in then Create account, with
     * Create account the one filled button; reading without an account is
     * the outlined alternative beneath. All three are the same 44px height.
     */
    it('offers log in and create account first, then browse, when signed out', () => {
        render(<CtaBand boardCount={53} />);

        const links = screen.getAllByRole('link');

        expect(links.map((link) => link.textContent)).toEqual([
            'Log in',
            'Create account',
            'Browse without an account',
        ]);
        expect(links.map((link) => link.getAttribute('href'))).toEqual([
            '/login',
            '/register',
            '/popular',
        ]);
        links.forEach((link) => expect(link).toHaveClass('h-11', 'w-full'));
        expect(links[1]).toHaveClass('bg-primary');
        [links[0], links[2]].forEach((link) => {
            expect(link).toHaveClass('border', 'border-border-strong');
            expect(link).not.toHaveClass('bg-primary');
        });
    });

    it('separates the account pair from browsing with an "or"', () => {
        render(<CtaBand boardCount={53} />);

        expect(screen.getByText('or')).toBeInTheDocument();
    });

    it('offers only the way into the feed when signed in, filled', () => {
        mockPage.props = {
            auth: { user: { id: 1, email: 'anon@example.com' } as User },
        };

        render(<CtaBand boardCount={53} />);

        const links = screen.getAllByRole('link');

        expect(links).toHaveLength(1);
        expect(links[0]).toHaveTextContent('Browse without an account');
        expect(links[0]).toHaveClass('bg-primary');
        expect(screen.queryByText('or')).not.toBeInTheDocument();
    });

    /**
     * Three columns: the buttons, what an account adds, what reading without
     * one gives. Ruled on the top and between, never the bottom, and meeting
     * the band's edges; stacked and ruled off one from another below `lg`.
     */
    it('lays the buttons and the two lists out as ruled columns', () => {
        render(<CtaBand boardCount={53} />);

        const browse = screen.getByRole('link', {
            name: 'Browse without an account',
        });
        const buttonBlock = browse.parentElement;
        const buttonColumn = buttonBlock?.parentElement;
        const grid = buttonColumn?.parentElement;

        /* Three in a row from `xl`; buttons over the two lists from `lg`. */
        expect(grid).toHaveClass(
            'grid',
            'border-t',
            'lg:grid-cols-2',
            'xl:grid-cols-[486px_minmax(0,1fr)_minmax(0,1fr)]',
        );
        expect(buttonColumn).toHaveClass('lg:col-span-2', 'xl:col-span-1');

        /* The rules meet the band's edges and never close the bottom. */
        expect(grid).toHaveClass('-mx-6', '-mb-14');
        expect(grid).not.toHaveClass('border-b');
        expect(grid).not.toHaveClass('border-x');

        /* The button block lines up with the description at every width. */
        expect(buttonBlock).toHaveClass('max-w-[438px]', 'w-full');

        expect(grid?.children).toHaveLength(3);
        const [, withAccount, withoutOne] = [...(grid?.children ?? [])];
        expect(withAccount).toHaveTextContent('With an account');
        expect(withAccount).toHaveClass(
            'border-t',
            'xl:border-t-0',
            'xl:border-l',
        );
        expect(withoutOne).toHaveTextContent('Without one');
        expect(withoutOne).toHaveClass(
            'border-t',
            'lg:border-l',
            'xl:border-t-0',
        );

        expect(
            screen.getByRole('link', { name: 'Log in' }).parentElement,
        ).toHaveClass('grid', 'grid-cols-2');
        expect(browse).toHaveClass('w-full');
    });

    /**
     * The "or" sits close to both the pair and Browse: 8px either side and a
     * line with no extra leading, not the larger gap the old layout left.
     */
    it('keeps the "or" separator tight', () => {
        render(<CtaBand boardCount={53} />);

        const or = screen.getByText('or');

        expect(or).toHaveClass('leading-none');
        expect(or.parentElement).toHaveClass('gap-2');
    });

    /**
     * What each path gets you, so the choice is an informed one. Every line
     * names something Clover does, and the board count is the visitor's own,
     * passed down from the server rather than written by hand.
     */
    it('says what an account adds and what reading without one gives', () => {
        render(<CtaBand boardCount={53} />);

        expect(
            screen.getByRole('heading', { level: 3, name: 'With an account' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { level: 3, name: 'Without one' }),
        ).toBeInTheDocument();
        [
            'Reply to any thread, still signed Anonymous',
            'Save threads to come back to',
            'Follow the boards you read most',
            "Keep a list of the threads you've read",
            '53 boards, read in full',
            'Replies nested under the post they answer',
            'Refreshed from 4chan through the day',
        ].forEach((line) => expect(screen.getByText(line)).toBeInTheDocument());
    });

    it('counts the boards it was given, not a fixed number', () => {
        render(<CtaBand boardCount={1234} />);

        expect(
            screen.getByText('1,234 boards, read in full'),
        ).toBeInTheDocument();
    });

    it('drops the comparison for a reader who already has an account', () => {
        mockPage.props = {
            auth: { user: { id: 1, email: 'anon@example.com' } as User },
        };

        render(<CtaBand boardCount={53} />);

        expect(
            screen.queryByRole('heading', { name: 'With an account' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByText('53 boards, read in full'),
        ).not.toBeInTheDocument();
    });

    /**
     * Green is the accent and never a large fill. The band sits on the same
     * paper as every other, and only the button carries the colour.
     */
    it('does not fill the band with colour', () => {
        const { container } = render(<CtaBand boardCount={53} />);

        expect(container.querySelector('section')?.className).not.toMatch(
            /\bbg-(primary|success|green)/,
        );
    });
});
