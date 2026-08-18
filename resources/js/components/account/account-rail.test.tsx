import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AccountRail } from '@/components/account/account-rail';
import { makeProfileComment } from '@/fixtures/factories';

vi.mock('@inertiajs/react', () => ({
    Link: ({
        href,
        children,
        ...props
    }: { href: string | { url: string }; children: ReactNode } & Record<
        string,
        unknown
    >) => (
        <a href={typeof href === 'string' ? href : href.url} {...props}>
            {children}
        </a>
    ),
}));

describe('AccountRail', () => {
    /**
     * Counted from the replies the page already holds, most first. Not an
     * interest graph and not a recommendation -- an anon's own replies carry
     * the board they were written on, so this is arithmetic on data in hand.
     */
    it('ranks the boards this anon writes on, most first', () => {
        render(
            <AccountRail
                comments={[
                    makeProfileComment({ board: '/g/' }),
                    makeProfileComment({ board: '/co/' }),
                    makeProfileComment({ board: '/g/' }),
                ]}
            />,
        );

        const rows = screen.getAllByRole('term').map((row) => row.textContent);

        expect(rows).toEqual(['/g/', '/co/']);
        expect(screen.getAllByRole('definition')[0]).toHaveTextContent('2');
    });

    /**
     * A fresh account has written nothing, and a panel headed "Where you post"
     * over an empty list states a fact it does not have -- the same reason the
     * notifications screen explains itself rather than claiming you are caught
     * up.
     */
    it('omits the panel entirely when there is nothing to count', () => {
        render(<AccountRail comments={[]} />);

        expect(screen.queryByText('Where you post')).not.toBeInTheDocument();
        expect(screen.getByText('Your account')).toBeInTheDocument();
    });

    it('links the rows the avatar dropdown carries', () => {
        render(<AccountRail comments={[]} />);

        expect(screen.getByRole('link', { name: 'Bookmarks' })).toHaveAttribute(
            'href',
            '/bookmarks',
        );
        expect(
            screen.getByRole('link', { name: 'Two-factor authentication' }),
        ).toHaveAttribute('href', '/settings/two-factor');
    });

    /** `lg` and up, like every other rail: below it the page is one column. */
    it('renders only at `lg` and up', () => {
        const { container } = render(<AccountRail comments={[]} />);

        const rail = container.querySelector('[data-slot="account-rail"]');

        expect(rail).toHaveClass('hidden');
        expect(rail).toHaveClass('lg:flex');
    });
});
