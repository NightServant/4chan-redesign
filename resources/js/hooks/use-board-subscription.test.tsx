import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBoardSubscription } from '@/hooks/use-board-subscription';
import type { User } from '@/types/auth';

/**
 * The same receiver-carrying router double `use-bookmark.test.tsx` documents.
 *
 * `{ post: vi.fn(), delete: vi.fn() }` is three plain functions with no `this`,
 * and it cannot express the way this codebase actually broke: picking the
 * method off the object (`const request = cond ? router.delete : router.post`)
 * detaches it, `this` is undefined inside, and Inertia throws
 * `Cannot read properties of undefined (reading 'visit')` before a request is
 * ever made. Routing both methods through `this.visit` means a detached call
 * fails here the way it fails in the browser.
 */
const { usePage, router } = vi.hoisted(() => ({
    usePage: vi.fn(),
    router: {
        visit: vi.fn(),
        post(url: string, data?: unknown, options?: unknown) {
            return this.visit(url, {
                ...(options ?? {}),
                method: 'post',
                data,
            });
        },
        delete(url: string, options?: unknown) {
            return this.visit(url, { ...(options ?? {}), method: 'delete' });
        },
    },
}));

vi.mock('@inertiajs/react', () => ({
    usePage,
    router,
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

const USER: User = {
    id: 1,
    email: 'anon@example.com',
    email_verified_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
};

function mockPage(signedIn: boolean): void {
    usePage.mockReturnValue({
        url: '/g/',
        props: { auth: { user: signedIn ? USER : null } },
    });
}

function Harness({ subscribed }: { subscribed: boolean }) {
    const { toggleSubscription, authGate } = useBoardSubscription();

    return (
        <>
            <button
                type="button"
                onClick={() => toggleSubscription({ id: 12, subscribed })}
            >
                Toggle
            </button>
            {authGate}
        </>
    );
}

beforeEach(() => {
    router.visit.mockClear();
    mockPage(true);
});

describe('useBoardSubscription', () => {
    it('asks the server to follow a board that is not followed', async () => {
        const user = userEvent.setup();
        render(<Harness subscribed={false} />);

        await user.click(screen.getByRole('button', { name: 'Toggle' }));

        expect(router.visit).toHaveBeenCalledWith(
            '/boards/12/subscribe',
            expect.objectContaining({ method: 'post' }),
        );
    });

    it('asks the server to unfollow one that is', async () => {
        const user = userEvent.setup();
        render(<Harness subscribed />);

        await user.click(screen.getByRole('button', { name: 'Toggle' }));

        expect(router.visit).toHaveBeenCalledWith(
            '/boards/12/subscribe',
            expect.objectContaining({ method: 'delete' }),
        );
    });

    /**
     * The press happens above the thread list and the reply is a redirect back.
     * Without this the page returns to the top and the board an anon just
     * joined is somewhere above them, which reads as nothing having happened.
     *
     * It has to arrive as an *option*: `router.post(url, data, options)`, so
     * passing it second puts it in the request body where it does nothing.
     */
    it('preserves scroll in both directions', async () => {
        const user = userEvent.setup();

        render(<Harness subscribed={false} />);
        await user.click(screen.getByRole('button', { name: 'Toggle' }));

        expect(router.visit).toHaveBeenLastCalledWith(
            '/boards/12/subscribe',
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    /**
     * Reading is open. Being bounced to the login form for reaching at a
     * control on a public page is not how that reads, and it is what the
     * auth-gated route does on its own.
     */
    it('opens the gate for a signed-out anon and sends nothing', async () => {
        const user = userEvent.setup();
        mockPage(false);

        render(<Harness subscribed={false} />);

        await user.click(screen.getByRole('button', { name: 'Toggle' }));

        expect(await screen.findByRole('dialog')).toBeInTheDocument();
        expect(router.visit).not.toHaveBeenCalled();
    });
});
