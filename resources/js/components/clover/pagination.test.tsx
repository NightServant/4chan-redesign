import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { getPaginationRange, Pagination } from '@/components/clover/pagination';

describe('getPaginationRange', () => {
    it('returns nothing for a zero page count', () => {
        expect(getPaginationRange(1, 0)).toEqual([]);
    });

    it('lists every page with no ellipsis when a single page exists', () => {
        expect(getPaginationRange(1, 1)).toEqual([{ type: 'page', page: 1 }]);
    });

    it('lists every page with no ellipsis when the range is short enough', () => {
        expect(getPaginationRange(3, 5)).toEqual([
            { type: 'page', page: 1 },
            { type: 'page', page: 2 },
            { type: 'page', page: 3 },
            { type: 'page', page: 4 },
            { type: 'page', page: 5 },
        ]);
    });

    it('shows only a right ellipsis when the current page sits at the start', () => {
        const result = getPaginationRange(1, 20);

        expect(result[0]).toEqual({ type: 'page', page: 1 });
        expect(result.at(-1)).toEqual({ type: 'page', page: 20 });
        expect(result.filter((i) => i.type === 'ellipsis')).toHaveLength(1);
        expect(result.find((i) => i.type === 'ellipsis')).toEqual({
            type: 'ellipsis',
            key: 'end',
        });
    });

    it('shows only a left ellipsis when the current page sits at the end', () => {
        const result = getPaginationRange(20, 20);

        expect(result[0]).toEqual({ type: 'page', page: 1 });
        expect(result.at(-1)).toEqual({ type: 'page', page: 20 });
        expect(result.filter((i) => i.type === 'ellipsis')).toHaveLength(1);
        expect(result.find((i) => i.type === 'ellipsis')).toEqual({
            type: 'ellipsis',
            key: 'start',
        });
    });

    it('shows both ellipses when the current page sits in the middle of a long range', () => {
        const result = getPaginationRange(10, 20);

        expect(result[0]).toEqual({ type: 'page', page: 1 });
        expect(result.at(-1)).toEqual({ type: 'page', page: 20 });
        expect(result.filter((i) => i.type === 'ellipsis')).toHaveLength(2);
        expect(result.some((i) => i.type === 'page' && i.page === 10)).toBe(
            true,
        );
    });

    it('clamps a current page above the page count', () => {
        const result = getPaginationRange(99, 5);

        expect(result).toEqual([
            { type: 'page', page: 1 },
            { type: 'page', page: 2 },
            { type: 'page', page: 3 },
            { type: 'page', page: 4 },
            { type: 'page', page: 5 },
        ]);
    });
});

describe('Pagination', () => {
    it('wraps the page list in a nav labelled Pagination', () => {
        render(<Pagination page={2} pageCount={5} onChange={() => {}} />);

        expect(
            screen.getByRole('navigation', { name: 'Pagination' }),
        ).toBeInTheDocument();
    });

    it('marks the current page with aria-current', () => {
        render(<Pagination page={2} pageCount={5} onChange={() => {}} />);

        const current = screen.getByRole('button', { name: '2' });
        const other = screen.getByRole('button', { name: '3' });

        expect(current).toHaveAttribute('aria-current', 'page');
        expect(other).not.toHaveAttribute('aria-current');
    });

    it('renders page numbers with tabular-nums so the row does not reflow', () => {
        render(<Pagination page={2} pageCount={5} onChange={() => {}} />);

        expect(screen.getByRole('button', { name: '2' })).toHaveClass(
            'tabular-nums',
        );
    });

    it('calls onChange with the clicked page', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<Pagination page={2} pageCount={5} onChange={onChange} />);

        await user.click(screen.getByRole('button', { name: '3' }));

        expect(onChange).toHaveBeenCalledWith(3);
    });

    it('disables Previous at the first page and it cannot be activated', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<Pagination page={1} pageCount={5} onChange={onChange} />);

        const prev = screen.getByRole('button', { name: 'Previous page' });

        expect(prev).toBeDisabled();
        expect(prev).toHaveAttribute('aria-disabled', 'true');

        await user.click(prev);

        expect(onChange).not.toHaveBeenCalled();
    });

    it('disables Next at the last page and it cannot be activated', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<Pagination page={5} pageCount={5} onChange={onChange} />);

        const next = screen.getByRole('button', { name: 'Next page' });

        expect(next).toBeDisabled();
        expect(next).toHaveAttribute('aria-disabled', 'true');

        await user.click(next);

        expect(onChange).not.toHaveBeenCalled();
    });

    it('keeps Previous and Next enabled in the middle of the range', () => {
        render(<Pagination page={3} pageCount={5} onChange={() => {}} />);

        expect(
            screen.getByRole('button', { name: 'Previous page' }),
        ).toBeEnabled();
        expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();
    });

    it('hides the ellipsis from assistive technology and keeps it out of the tab order', () => {
        render(<Pagination page={10} pageCount={20} onChange={() => {}} />);

        const nav = screen.getByRole('navigation', { name: 'Pagination' });
        const focusable = nav.querySelectorAll(
            'button, [tabindex]:not([tabindex="-1"])',
        );

        // Prev, Next, first, last, current, both siblings = 7 focusable buttons.
        // No ellipsis marker should ever be independently focusable.
        focusable.forEach((el) => {
            expect(el.textContent).not.toBe('…');
        });

        const ariaHiddenEllipses = nav.querySelectorAll('[aria-hidden="true"]');
        expect(ariaHiddenEllipses.length).toBeGreaterThan(0);
        ariaHiddenEllipses.forEach((el) => {
            expect(el.tagName).not.toBe('BUTTON');
        });
    });
});
