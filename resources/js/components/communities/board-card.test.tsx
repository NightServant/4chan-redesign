import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { BoardCard } from '@/components/communities/board-card';
import { makeDirectoryEntry } from '@/fixtures/factories';

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

const TECHNOLOGY = makeDirectoryEntry({
    slug: '/g/',
    name: 'Technology',
    subscribed: true,
});
const BUSINESS = makeDirectoryEntry({
    slug: '/biz/',
    name: 'Business',
    description: 'Markets, ventures and the arguments between them.',
});

function renderCard(entry = BUSINESS, subscribed = entry.subscribed) {
    const onToggleSubscribe = vi.fn();

    render(
        <BoardCard
            entry={entry}
            subscribed={subscribed}
            onToggleSubscribe={onToggleSubscribe}
        />,
    );

    return { onToggleSubscribe };
}

describe('BoardCard', () => {
    it('links the board name at the routable slug', () => {
        renderCard();

        const link = screen.getByRole('link', { name: 'Business' });

        expect(link).toHaveAttribute('href', '/biz');
        expect(link.closest('h3')).not.toBeNull();
    });

    it('shows the slug, description and stats', () => {
        renderCard();

        expect(screen.getByText('/biz/')).toBeInTheDocument();
        expect(screen.getByText(BUSINESS.description)).toBeInTheDocument();
        expect(
            screen.getByText(`${BUSINESS.threads} threads`),
        ).toBeInTheDocument();
    });

    it('names the subscribe control after the board it acts on', () => {
        renderCard();

        const subscribe = screen.getByRole('button', {
            name: 'Subscribe to /biz/',
        });

        expect(subscribe).toHaveAttribute('aria-pressed', 'false');
    });

    it('reports a subscribed board as pressed', () => {
        renderCard(TECHNOLOGY);

        expect(
            screen.getByRole('button', { name: 'Subscribed to /g/' }),
        ).toHaveAttribute('aria-pressed', 'true');
    });

    it('reports a toggle made with the pointer', async () => {
        const user = userEvent.setup();
        const { onToggleSubscribe } = renderCard();

        await user.click(
            screen.getByRole('button', { name: 'Subscribe to /biz/' }),
        );

        expect(onToggleSubscribe).toHaveBeenCalledOnce();
    });

    it('reaches the subscribe control by keyboard alone', async () => {
        const user = userEvent.setup();
        const { onToggleSubscribe } = renderCard();

        await user.tab();

        expect(screen.getByRole('link', { name: 'Business' })).toHaveFocus();

        await user.tab();

        expect(
            screen.getByRole('button', { name: 'Subscribe to /biz/' }),
        ).toHaveFocus();

        await user.keyboard('{Enter}');

        expect(onToggleSubscribe).toHaveBeenCalledOnce();
    });
});
