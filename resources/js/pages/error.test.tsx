import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import ErrorPage from '@/pages/error';

vi.mock('@inertiajs/react', () => ({
    /* `PageMeta` reads the shared `appUrl` to build an absolute `og:url`, and
       renders its tags inside `Head`. Neither shows up in the DOM these tests
       query; the mock exists so the component can mount. */
    usePage: () => ({ props: { appUrl: 'https://clover.test' }, url: '/' }),
    Head: () => null,
    Link: ({
        href,
        children,
        ...props
    }: {
        href: string | { url: string };
        children: ReactNode;
    } & Record<string, unknown>) => {
        const url = typeof href === 'string' ? href : href.url;

        return (
            <a href={url} {...props}>
                {children}
            </a>
        );
    },
}));

const CASES: ReadonlyArray<{ status: number; title: string; body: string }> = [
    {
        status: 403,
        title: 'Not yours to see',
        body: 'This page exists. Your account cannot open it.',
    },
    {
        status: 404,
        title: 'No such page',
        body: 'The URL does not match a board, a thread, or anything else here. Check the slug.',
    },
    {
        status: 419,
        title: 'The page expired',
        body: 'You had this open long enough that the session token went stale. Load it again.',
    },
    {
        status: 500,
        title: 'Something broke',
        body: 'The server failed on this request. It has been logged. Nothing you did caused it.',
    },
    {
        status: 503,
        title: 'Down for maintenance',
        body: 'Clover is being worked on. It will be back without you doing anything.',
    },
];

describe('ErrorPage', () => {
    it.each(CASES)(
        'renders $status with its own title, body and the number itself',
        ({ status, title, body }) => {
            render(<ErrorPage status={status} />);

            expect(
                screen.getByRole('heading', { level: 1, name: String(status) }),
            ).toBeInTheDocument();
            expect(
                screen.getByRole('heading', { level: 2, name: title }),
            ).toBeInTheDocument();
            expect(screen.getByText(body)).toBeInTheDocument();
        },
    );

    it.each([403, 404])('sends an anon back to the feed from %i', (status) => {
        render(<ErrorPage status={status} />);

        expect(
            screen.getByRole('link', { name: 'Back to the feed' }),
        ).toHaveAttribute('href', '/');
    });

    it('offers a retry on 419, since reloading is what fixes a stale token', () => {
        render(<ErrorPage status={419} />);

        expect(
            screen.getByRole('button', { name: 'Try again' }),
        ).toBeInTheDocument();
    });

    it.each([500, 503])(
        'offers no action on %i, because there is nothing useful to press',
        (status) => {
            render(<ErrorPage status={status} />);

            expect(screen.queryByRole('link')).not.toBeInTheDocument();
            expect(screen.queryByRole('button')).not.toBeInTheDocument();
        },
    );

    it('still renders something for a status it has no copy for', () => {
        render(<ErrorPage status={418} />);

        expect(
            screen.getByRole('heading', { level: 1, name: '418' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', {
                level: 2,
                name: 'Unexpected response',
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Back to the feed' }),
        ).toBeInTheDocument();
    });
});
