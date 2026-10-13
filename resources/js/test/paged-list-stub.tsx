import type { ReactNode } from 'react';

/**
 * Stands in for `PagedList` in the page tests, which are about what a page
 * draws from the props it is given.
 *
 * What a real `<InfiniteScroll>` does with a response -- the request, the
 * merge, the de-duplication -- is `paged-list.test.tsx`'s job, against the
 * real component. This only records which prop the page told the list to
 * page, so a page that names the wrong one is caught here.
 */
export function PagedListStub({
    data,
    as: Element = 'div',
    className,
    children,
}: {
    data: string;
    as?: 'div' | 'ul';
    className?: string;
    children: ReactNode;
}) {
    return (
        <Element
            data-testid="paged-list"
            data-prop={data}
            className={className}
        >
            {children}
        </Element>
    );
}
