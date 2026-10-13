import { InfiniteScroll } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { Spinner } from '@/components/ui/spinner';

type PagedListProps = {
    /**
     * The name of the page prop holding the rows -- the one the controller
     * wrapped in `Inertia::scroll()`. The rows themselves are `children`, so
     * the list is drawn from `props[data].data` and nothing here reads it.
     */
    data: string;
    /** The element that holds the rows. A `ul` when the rows are `li`s. */
    as?: 'div' | 'ul';
    /** Classes for the element that holds the rows, which `<InfiniteScroll>` tags page by page. */
    className?: string;
    children: ReactNode;
};

/**
 * A list that loads its next page as the reader nears the end of it.
 *
 * There is no button, and that is deliberate: the "Load more" this replaced
 * showed two skeletons and put itself back, because there was no second page
 * behind it. This one cannot do that -- the end of the list asks the server
 * for the next page, and when the server has none the trigger does nothing.
 *
 * Forward only (`onlyNext`): every list starts at its first page, so there is
 * never a previous one to load. The URL is left alone (`preserveUrl`) so a
 * reload or a shared link starts at the top rather than at whichever cursor
 * happened to be on screen, with the pages above it missing. The query string
 * the request does carry -- `q`, `type`, `sort`, `time` -- is the page's own.
 */
export function PagedList({ data, as, className, children }: PagedListProps) {
    /* `<InfiniteScroll>` renders three siblings -- an empty start marker, the
       rows, and an end marker that holds the spinner -- not one element. Left
       as bare children of a flex column they would be three flex items, and
       the two empty markers would each add a gap's worth of space above and
       below the list. A block wrapper makes them one item. */
    return (
        <div data-slot="paged-list">
            <InfiniteScroll
                data={data}
                as={as}
                onlyNext
                preserveUrl
                buffer={600}
                className={className}
                loading={
                    <div className="flex justify-center py-4 text-muted-foreground">
                        <Spinner />
                    </div>
                }
            >
                {children}
            </InfiniteScroll>
        </div>
    );
}
