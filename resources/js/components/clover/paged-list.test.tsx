import type { HttpClient, HttpRequestConfig } from '@inertiajs/core';
import { createInertiaApp, usePage } from '@inertiajs/react';
import { waitFor } from '@testing-library/react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PagedList } from '@/components/clover/paged-list';
import type { Paged } from '@/types/clover';

/**
 * The real `<InfiniteScroll>`, the real router and the real merge -- the only
 * doubles are the network and `IntersectionObserver`, which jsdom lacks.
 *
 * A stand-in for `<InfiniteScroll>` would only prove that the stand-in renders
 * its children. What needs proving is that a page-two response, shaped the way
 * `Inertia::scroll()` shapes it (see `tests/Feature/PagingTest.php`), ends up
 * appended to what is on screen, de-duplicated on `id`, by the request the
 * component actually makes.
 */
type Row = { id: number; title: string };

function List() {
    const { threads } = usePage<{ threads: Paged<Row> }>().props;

    return (
        <PagedList data="threads" className="rows">
            {threads.data.map((row) => (
                <p key={row.id} data-testid="row">
                    {row.title}
                </p>
            ))}
        </PagedList>
    );
}

const FIRST_PAGE = {
    component: 'list',
    url: '/search?q=zebra&type=posts&sort=latest',
    version: 'v1',
    props: {
        errors: {},
        threads: {
            data: [
                { id: 1, title: 'one' },
                { id: 2, title: 'two' },
            ],
        },
    },
    mergeProps: ['threads.data'],
    matchPropsOn: ['threads.data.id'],
    scrollProps: {
        threads: {
            pageName: 'page',
            previousPage: null,
            nextPage: 2,
            currentPage: 1,
            reset: false,
        },
    },
};

/* What the server answers a follow-up with: the next rows, one of them (id 2)
   a repeat of a row already shown, and no next page. */
const SECOND_PAGE = {
    ...FIRST_PAGE,
    props: {
        errors: {},
        threads: {
            data: [
                { id: 2, title: 'two' },
                { id: 3, title: 'three' },
            ],
        },
    },
    scrollProps: {
        threads: {
            pageName: 'page',
            previousPage: 1,
            nextPage: null,
            currentPage: 2,
            reset: false,
        },
    },
};

let root: Root | undefined;
const requests: HttpRequestConfig[] = [];

const network: HttpClient = {
    request(config) {
        requests.push(config);

        return Promise.resolve({
            status: 200,
            data: JSON.stringify(SECOND_PAGE),
            headers: {
                'x-inertia': 'true',
                'content-type': 'application/json',
            },
        });
    },
};

async function mount(): Promise<void> {
    await createInertiaApp({
        page: FIRST_PAGE as never,
        resolve: () => List,
        http: network,
        setup: ({ el, App, props }) => {
            root = createRoot(el);
            root.render(<App {...props} />);
        },
    });
}

function titles(): (string | null)[] {
    return [...document.querySelectorAll('[data-testid="row"]')].map(
        (row) => row.textContent,
    );
}

/* Mounted once for the file: the router and the page it holds are module
   singletons, so a second `createInertiaApp` in the same process inherits the
   first one's state rather than starting clean. Everything below reads what
   that one mount did. */
beforeAll(async () => {
    /* Every observed element reports itself as on screen, so the end of the
       list is "reached" as soon as the component asks to be told. */
    vi.stubGlobal(
        'IntersectionObserver',
        class {
            constructor(
                private readonly callback: IntersectionObserverCallback,
            ) {}
            observe(target: Element): void {
                this.callback(
                    [
                        {
                            isIntersecting: true,
                            target,
                        } as IntersectionObserverEntry,
                    ],
                    this as unknown as IntersectionObserver,
                );
            }
            unobserve(): void {}
            disconnect(): void {}
            takeRecords(): IntersectionObserverEntry[] {
                return [];
            }
        },
    );

    window.history.replaceState({}, '', FIRST_PAGE.url);
    document.body.innerHTML = '<div id="app"></div>';

    await mount();
    await waitFor(() => expect(titles()).toHaveLength(3));
});

afterAll(() => {
    root?.unmount();
    vi.unstubAllGlobals();
});

describe('PagedList', () => {
    it('appends the next page the end of the list asks for, without repeating a row', () => {
        expect(titles()).toEqual(['one', 'two', 'three']);
    });

    it('asks for the next page of the same search, as an append, for this prop only', () => {
        const [request] = requests;
        const url = new URL(request.url, 'http://localhost');
        const query = {
            ...Object.fromEntries(url.searchParams),
            ...request.params,
        };

        /* Filters carried, page number added -- not a different search. */
        expect(query).toMatchObject({
            q: 'zebra',
            type: 'posts',
            sort: 'latest',
            page: '2',
        });
        expect(request.headers).toMatchObject({
            'X-Inertia-Partial-Data': 'threads',
            'X-Inertia-Infinite-Scroll-Merge-Intent': 'append',
        });
    });

    it('asks for nothing once the last page has loaded, and shows no button to ask again', () => {
        expect(requests).toHaveLength(1);
        expect(document.querySelector('button')).toBeNull();
    });
});
