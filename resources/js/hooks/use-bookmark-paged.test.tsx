import type { HttpClient, HttpRequestConfig } from '@inertiajs/core';
import { createInertiaApp, usePage } from '@inertiajs/react';
import { fireEvent, waitFor } from '@testing-library/react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PagedList } from '@/components/clover/paged-list';
import { ThreadCard } from '@/components/clover/thread-card';
import { makeThread } from '@/fixtures/factories';
import { useBookmark } from '@/hooks/use-bookmark';
import type { Paged, Thread } from '@/types/clover';

/**
 * Saving a thread from the middle of a scrolled list, through the real
 * `<InfiniteScroll>` and the real router.
 *
 * The save is answered with a redirect back, which the browser follows as a
 * full visit: every prop is re-sent from page one, and the pages the reader
 * had scrolled through were thrown away under them. These tests load two
 * pages, press a card on the second, and check the list is still the same
 * length with the card shown as saved. The doubles are the network and
 * `IntersectionObserver` only; a stand-in router could not have the bug.
 */
const USER = { id: 1 };

function List() {
    const { threads } = usePage<{ threads: Paged<Thread> }>().props;
    const { toggleBookmark } = useBookmark({ keepsPages: true });

    return (
        <PagedList data="threads" className="rows">
            {threads.data.map((thread) => (
                <ThreadCard
                    key={thread.id}
                    thread={thread}
                    onBookmark={() => toggleBookmark(thread)}
                />
            ))}
        </PagedList>
    );
}

const row = (id: number, bookmarked = false) =>
    makeThread({ id, no: id, title: `Thread ${id}`, bookmarked });

const FIRST_PAGE = {
    component: 'list',
    url: '/popular',
    version: 'v1',
    props: {
        errors: {},
        auth: { user: USER },
        threads: { data: [row(1), row(2)] },
    },
    mergeProps: ['threads.data'],
    matchPropsOn: ['threads.data.id'],
    scrollProps: {
        threads: {
            pageName: 'cursor',
            previousPage: null,
            nextPage: 'next',
            currentPage: 1,
            reset: false,
        },
    },
};

const SECOND_PAGE = {
    ...FIRST_PAGE,
    props: {
        errors: {},
        auth: { user: USER },
        threads: { data: [row(3), row(4)] },
    },
    scrollProps: {
        threads: {
            pageName: 'cursor',
            previousPage: 'prev',
            nextPage: null,
            currentPage: 'next',
            reset: false,
        },
    },
};

/* What Laravel answers once the redirect back has been followed with the
   save's own partial headers: the page's shared `auth` and nothing else. */
const AUTH_ONLY = {
    component: 'list',
    url: '/popular',
    version: 'v1',
    props: { errors: {}, auth: { user: USER } },
};

let root: Root | undefined;
const requests: HttpRequestConfig[] = [];
let refuseSaves = false;

const network: HttpClient = {
    request(config) {
        requests.push(config);

        if (config.method === 'get') {
            return Promise.resolve({
                status: 200,
                data: JSON.stringify(SECOND_PAGE),
                headers: { 'x-inertia': 'true' },
            });
        }

        /* The redirect back is a GET that inherits the save's headers. Asked
           for `auth` alone, the server answers with `auth` alone; asked for
           nothing in particular it answers with the whole page, from the top. */
        const answer = config.headers?.['X-Inertia-Partial-Data']
            ? {
                  ...AUTH_ONLY,
                  props: {
                      ...AUTH_ONLY.props,
                      errors: refuseSaves ? { bookmark: 'Refused.' } : {},
                  },
              }
            : FIRST_PAGE;

        return Promise.resolve({
            status: 200,
            data: JSON.stringify(answer),
            headers: { 'x-inertia': 'true' },
        });
    },
};

function cards(): HTMLElement[] {
    return [
        ...document.querySelectorAll<HTMLElement>('[data-slot="thread-card"]'),
    ];
}

function pressed(title: string): string | null {
    const card = cards().find((element) =>
        element.textContent?.includes(title),
    );

    return (
        card
            ?.querySelector('button[aria-pressed]')
            ?.getAttribute('aria-pressed') ?? null
    );
}

function pressBookmark(title: string): void {
    const card = cards().find((element) =>
        element.textContent?.includes(title),
    );

    fireEvent.click(card!.querySelector('button[aria-pressed]')!);
}

/* Mounted once: the router and its page are singletons (see
   `paged-list.test.tsx`). */
beforeAll(async () => {
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

    await createInertiaApp({
        page: FIRST_PAGE as never,
        resolve: () => List,
        http: network,
        setup: ({ el, App, props }) => {
            root = createRoot(el);
            root.render(<App {...props} />);
        },
    });

    await waitFor(() => expect(cards()).toHaveLength(4));
});

afterAll(() => {
    root?.unmount();
    vi.unstubAllGlobals();
});

describe('saving a thread from a scrolled list', () => {
    it('keeps every loaded page, and shows the pressed card as saved', async () => {
        expect(pressed('Thread 4')).toBe('false');

        pressBookmark('Thread 4');

        await waitFor(() => expect(pressed('Thread 4')).toBe('true'));
        await waitFor(() =>
            expect(requests.some((r) => r.method === 'post')).toBe(true),
        );

        expect(cards()).toHaveLength(4);
        expect(pressed('Thread 1')).toBe('false');

        /* The follow-up is a partial for `auth` alone, so the list is never
           in the response to be replaced. */
        const save = requests.find((r) => r.method === 'post')!;

        expect(save.url).toContain('/threads/4/bookmark');
        expect(save.headers).toMatchObject({
            'X-Inertia-Partial-Data': 'auth',
        });
    });

    it('puts the card back, and still has every page, when the server refuses the save', async () => {
        refuseSaves = true;

        expect(pressed('Thread 2')).toBe('false');

        pressBookmark('Thread 2');

        await waitFor(() =>
            expect(requests.filter((r) => r.method === 'post')).toHaveLength(2),
        );
        await waitFor(() => expect(pressed('Thread 2')).toBe('false'));

        expect(cards()).toHaveLength(4);
        expect(pressed('Thread 4')).toBe('true');
    });
});
