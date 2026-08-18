import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { BoardRow } from '@/components/communities/board-row';
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

function renderRow(entry = BUSINESS, subscribed = entry.subscribed) {
    const onToggleSubscribe = vi.fn();

    const { container } = render(
        <BoardRow
            entry={entry}
            subscribed={subscribed}
            onToggleSubscribe={onToggleSubscribe}
        />,
    );

    function slot(name: string): HTMLElement {
        const node = container.querySelector<HTMLElement>(
            `[data-slot="${name}"]`,
        );

        if (node === null) {
            throw new Error(`No element carries data-slot="${name}".`);
        }

        return node;
    }

    return { container, onToggleSubscribe, slot };
}

/** The classes a card is made of, whatever their scale or colour token. */
function boxClasses(node: HTMLElement): string[] {
    return [...node.classList].filter((name) =>
        /^(border|rounded|bg-|shadow)/.test(name),
    );
}

describe('BoardRow', () => {
    /**
     * The same drawn paper `Card` carries, so a board reads as a piece of the
     * page rather than a flat panel on it. Only once the card's own surface
     * arrives at `md`: below it the row has no fill, and the page's paper
     * already shows through.
     */
    it('carries the dot matrix behind the card surface', () => {
        const { container } = render(
            <BoardRow
                entry={TECHNOLOGY}
                subscribed={false}
                onToggleSubscribe={() => {}}
            />,
        );

        const paper = container.querySelector(
            '[data-slot="pattern-field-paper"]',
        );

        expect(paper).not.toBeNull();
        expect(
            container.querySelector('[data-slot="pattern-field"]'),
        ).toHaveClass('md:block');
    });

    it('links the board name at the routable slug', () => {
        renderRow();

        const link = screen.getByRole('link', { name: 'Business' });

        expect(link).toHaveAttribute('href', '/biz');
        expect(link.closest('h3')).not.toBeNull();
    });

    it('shows the slug, description and thread count', () => {
        renderRow();

        expect(screen.getByText('/biz/')).toBeInTheDocument();
        expect(screen.getByText(BUSINESS.description)).toBeInTheDocument();
        expect(
            screen.getByText(`${BUSINESS.threads} threads`),
        ).toBeInTheDocument();
    });

    it('reports the thread count as a MachineValue rather than as prose', () => {
        const { container } = renderRow();

        const figures = [
            ...container.querySelectorAll('[data-slot="machine-value"]'),
        ].map((node) => node.textContent);

        expect(figures).toContain(`${BUSINESS.threads} threads`);
    });

    /**
     * The defect at ~320px: 53 boards each drawn as a bordered card holding a
     * three-line description and a button of its own, so one board filled
     * about a third of the screen and four were reachable without scrolling.
     *
     * A card is a border, a radius and a fill. jsdom has no layout engine, so
     * what is asserted is that none of those three is applied unconditionally:
     * every one of them has to be gated behind `md:` for the row below `md` to
     * be a ruled row rather than a box.
     */
    it('draws no border box around itself below md', () => {
        const { slot } = renderRow();

        expect(boxClasses(slot('board-row'))).toEqual([]);
    });

    it('restores the card box at md and up', () => {
        const { slot } = renderRow();

        const box = [...slot('board-row').classList].filter((name) =>
            name.startsWith('md:'),
        );

        expect(box).toEqual(expect.arrayContaining(['md:rounded-xl']));
        expect(box.some((name) => name.startsWith('md:border'))).toBe(true);
    });

    it('is not a Card, at any width', () => {
        const { container } = renderRow();

        expect(container.querySelector('[data-slot="card"]')).toBeNull();
    });

    /**
     * Avatar, name and slug on the first line — the description and the count
     * are not in it, which is what keeps that line to one line.
     */
    it('puts the avatar, the name and the slug on the first line, and nothing else', () => {
        const { slot } = renderRow();

        const identity = slot('board-row-identity');

        expect(identity).toHaveTextContent('Business');
        expect(identity).toHaveTextContent('/biz/');
        expect(identity.textContent).not.toMatch(/Markets, ventures/);
        expect(identity.textContent).not.toMatch(/threads/);
        expect(identity.querySelector('[data-slot="board-avatar"]')).not.toBe(
            null,
        );
    });

    /**
     * Two lines below `md`, whole at `md` and up. A 4chan `meta_description`
     * runs to three sentences, which at 272px is nine lines and the reason a
     * single board filled a third of the screen.
     */
    it('clamps the description to two lines below md and lets it run at md', () => {
        renderRow();

        const description = screen.getByText(BUSINESS.description);

        expect(description).toHaveClass('line-clamp-2');
        expect(description).toHaveClass('md:line-clamp-none');
    });

    /**
     * One control among 53. It shares the last line with the thread count
     * rather than taking a line of its own, and nothing here stretches it:
     * `Button` is `w-fit`, and a `w-full` in this file would merge that away.
     */
    it('keeps the Join control compact and beside the thread count', () => {
        const { slot } = renderRow();

        const footer = slot('board-row-footer');
        const join = screen.getByRole('button', { name: 'Join /biz/' });

        expect(footer).toContainElement(join);
        expect(footer).toHaveTextContent(`${BUSINESS.threads} threads`);
        expect(join).toHaveClass('w-fit');
        expect(join).not.toHaveClass('w-full');
    });

    it('names the Join control after the board it acts on', () => {
        renderRow();

        const join = screen.getByRole('button', { name: 'Join /biz/' });

        expect(join).toHaveAttribute('aria-pressed', 'false');
    });

    it('reports a followed board as pressed', () => {
        renderRow(TECHNOLOGY);

        expect(
            screen.getByRole('button', { name: 'Joined /g/' }),
        ).toHaveAttribute('aria-pressed', 'true');
    });

    it('reports a toggle made with the pointer', async () => {
        const user = userEvent.setup();
        const { onToggleSubscribe } = renderRow();

        await user.click(screen.getByRole('button', { name: 'Join /biz/' }));

        expect(onToggleSubscribe).toHaveBeenCalledOnce();
    });

    it('reaches the Join control by keyboard alone', async () => {
        const user = userEvent.setup();
        const { onToggleSubscribe } = renderRow();

        await user.tab();

        expect(screen.getByRole('link', { name: 'Business' })).toHaveFocus();

        await user.tab();

        expect(
            screen.getByRole('button', { name: 'Join /biz/' }),
        ).toHaveFocus();

        await user.keyboard('{Enter}');

        expect(onToggleSubscribe).toHaveBeenCalledOnce();
    });
});
