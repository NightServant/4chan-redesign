import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { BoardDirectory } from '@/components/communities/board-directory';
import { BOARD_DIRECTORY } from '@/fixtures/clover';

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

function renderDirectory(boards = BOARD_DIRECTORY) {
    render(<BoardDirectory boards={boards} />);

    return { search: screen.getByLabelText('Search boards') };
}

describe('BoardDirectory', () => {
    it('counts the boards and the subscriptions in the description', () => {
        renderDirectory();

        expect(screen.getByText('6 boards · 3 subscribed')).toBeInTheDocument();
    });

    it('lists exactly the routable boards, grouped by category', () => {
        renderDirectory();

        expect(screen.getAllByRole('link')).toHaveLength(
            BOARD_DIRECTORY.length,
        );

        const interests = screen.getByRole('region', { name: 'Interests' });

        expect(
            within(interests)
                .getAllByRole('link')
                .map((link) => link.textContent),
        ).toEqual(['Technology', 'Paranormal']);
    });

    it('recounts subscriptions as they are toggled', async () => {
        const user = userEvent.setup();
        renderDirectory();

        await user.click(
            screen.getByRole('button', { name: 'Subscribe to /biz/' }),
        );

        expect(screen.getByText('6 boards · 4 subscribed')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Subscribed to /biz/' }),
        ).toHaveAttribute('aria-pressed', 'true');
    });

    it('filters on slug, name and description', async () => {
        const user = userEvent.setup();
        const { search } = renderDirectory();

        await user.type(search, 'wallpaper');

        expect(screen.getAllByRole('link')).toHaveLength(1);
        expect(
            screen.getByRole('link', { name: 'Wallpapers' }),
        ).toBeInTheDocument();

        await user.clear(search);
        await user.type(search, '/fit/');

        expect(
            screen.getByRole('link', { name: 'Fitness' }),
        ).toBeInTheDocument();

        await user.clear(search);
        await user.type(search, 'storyboards');

        expect(
            screen.getByRole('link', { name: 'Comics' }),
        ).toBeInTheDocument();
    });

    it('drops a category group once nothing in it matches', async () => {
        const user = userEvent.setup();
        const { search } = renderDirectory();

        await user.type(search, 'wallpaper');

        expect(
            screen.getByRole('region', { name: 'Creative' }),
        ).toBeInTheDocument();
        expect(screen.queryByRole('region', { name: 'Interests' })).toBeNull();
    });

    it('says what matched nothing without apologising for it', async () => {
        const user = userEvent.setup();
        const { search } = renderDirectory();

        await user.type(search, 'anime');

        expect(
            screen.getByRole('heading', { name: 'No boards match' }),
        ).toBeInTheDocument();
        expect(
            screen.getByText('Nothing matches "anime". Clover has six boards.'),
        ).toBeInTheDocument();
        expect(screen.queryAllByRole('link')).toHaveLength(0);
    });
});
