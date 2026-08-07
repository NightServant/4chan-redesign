import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Pagination. Page numbers stay square and tabular so the row does not
 * reflow as digits change; the window collapses to an ellipsis once the
 * range grows past what fits.
 */

type PaginationPageItem = { type: 'page'; page: number };
type PaginationEllipsisItem = { type: 'ellipsis'; key: 'start' | 'end' };
type PaginationRangeItem = PaginationPageItem | PaginationEllipsisItem;

function range(start: number, end: number): number[] {
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

/**
 * Pure page-window calculation, exported so its edge cases (a single page,
 * the current page at either end, a range short enough to need no
 * ellipsis) can be tested directly without rendering anything.
 */
function getPaginationRange(
    page: number,
    pageCount: number,
    siblingCount = 1,
): PaginationRangeItem[] {
    if (pageCount <= 0) {
        return [];
    }

    const current = Math.min(Math.max(page, 1), pageCount);
    const totalPageNumbers = siblingCount * 2 + 5;

    if (pageCount <= totalPageNumbers) {
        return range(1, pageCount).map((p): PaginationRangeItem => ({
            type: 'page',
            page: p,
        }));
    }

    const leftSiblingIndex = Math.max(current - siblingCount, 1);
    const rightSiblingIndex = Math.min(current + siblingCount, pageCount);

    const showLeftEllipsis = leftSiblingIndex > 2;
    const showRightEllipsis = rightSiblingIndex < pageCount - 1;

    const items: PaginationRangeItem[] = [];

    if (!showLeftEllipsis && showRightEllipsis) {
        const leftItemCount = 3 + siblingCount * 2;
        range(1, leftItemCount).forEach((p) =>
            items.push({ type: 'page', page: p }),
        );
        items.push({ type: 'ellipsis', key: 'end' });
        items.push({ type: 'page', page: pageCount });
    } else if (showLeftEllipsis && !showRightEllipsis) {
        items.push({ type: 'page', page: 1 });
        items.push({ type: 'ellipsis', key: 'start' });
        const rightItemCount = 3 + siblingCount * 2;
        range(pageCount - rightItemCount + 1, pageCount).forEach((p) =>
            items.push({ type: 'page', page: p }),
        );
    } else if (showLeftEllipsis && showRightEllipsis) {
        items.push({ type: 'page', page: 1 });
        items.push({ type: 'ellipsis', key: 'start' });
        range(leftSiblingIndex, rightSiblingIndex).forEach((p) =>
            items.push({ type: 'page', page: p }),
        );
        items.push({ type: 'ellipsis', key: 'end' });
        items.push({ type: 'page', page: pageCount });
    } else {
        range(1, pageCount).forEach((p) =>
            items.push({ type: 'page', page: p }),
        );
    }

    return items;
}

type PaginationProps = {
    page: number;
    pageCount: number;
    onChange: (page: number) => void;
    /** Pages kept on each side of the current page before it collapses. */
    siblingCount?: number;
    className?: string;
};

/**
 * The visual box stays a 34px square (`size-8.5`) at every width, matching
 * the rest of Clover's control metrics. `before` expands the actual hit
 * area to 44px on touch widths via a transparent inset, then collapses
 * back to the visual box at `md`, so desktop pointers see no change.
 */
const pageButtonClasses = cn(
    'relative flex size-8.5 shrink-0 items-center justify-center rounded-md',
    'font-sans text-body-sm text-muted-foreground tabular-nums',
    'transition-colors duration-[var(--duration-hover)] ease-standard',
    'hover:not-disabled:bg-surface-hover hover:not-disabled:text-foreground',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    'disabled:pointer-events-none disabled:opacity-60',
    "before:absolute before:-inset-[5px] before:content-[''] md:before:inset-0",
);

function Pagination({
    page,
    pageCount,
    onChange,
    siblingCount = 1,
    className,
}: PaginationProps) {
    if (pageCount <= 0) {
        return null;
    }

    const current = Math.min(Math.max(page, 1), pageCount);
    const items = getPaginationRange(current, pageCount, siblingCount);
    const atStart = current <= 1;
    const atEnd = current >= pageCount;

    return (
        <nav
            aria-label="Pagination"
            className={cn('flex items-center', className)}
        >
            <ul className="flex items-center gap-1">
                <li>
                    <button
                        type="button"
                        className={pageButtonClasses}
                        disabled={atStart}
                        aria-disabled={atStart}
                        aria-label="Previous page"
                        onClick={() => {
                            if (!atStart) {
                                onChange(current - 1);
                            }
                        }}
                    >
                        <ChevronLeft className="size-4" aria-hidden="true" />
                    </button>
                </li>
                {items.map((item) =>
                    item.type === 'ellipsis' ? (
                        <li
                            key={`ellipsis-${item.key}`}
                            aria-hidden="true"
                            className="flex size-8.5 items-center justify-center text-faint"
                        >
                            <MoreHorizontal className="size-4" />
                        </li>
                    ) : (
                        <li key={item.page}>
                            <button
                                type="button"
                                className={cn(
                                    pageButtonClasses,
                                    item.page === current &&
                                        'bg-primary-soft font-semibold text-accent-text',
                                )}
                                aria-current={
                                    item.page === current ? 'page' : undefined
                                }
                                onClick={() => onChange(item.page)}
                            >
                                {item.page}
                            </button>
                        </li>
                    ),
                )}
                <li>
                    <button
                        type="button"
                        className={pageButtonClasses}
                        disabled={atEnd}
                        aria-disabled={atEnd}
                        aria-label="Next page"
                        onClick={() => {
                            if (!atEnd) {
                                onChange(current + 1);
                            }
                        }}
                    >
                        <ChevronRight className="size-4" aria-hidden="true" />
                    </button>
                </li>
            </ul>
        </nav>
    );
}

export { getPaginationRange, Pagination };
export type { PaginationProps, PaginationRangeItem };
