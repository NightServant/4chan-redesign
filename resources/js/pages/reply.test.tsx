import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Reply from '@/pages/reply';

const { router } = vi.hoisted(() => ({
    router: { post: vi.fn(), visit: vi.fn() },
}));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    router,
    usePage: () => ({
        props: { auth: { user: { id: 1 } } },
        url: '/g/1/reply',
    }),
    Link: ({
        href,
        children,
        ...props
    }: { href: string | { url: string }; children: ReactNode } & Record<
        string,
        unknown
    >) => (
        <a href={typeof href === 'string' ? href : href.url} {...props}>
            {children}
        </a>
    ),
}));

const THREAD = {
    no: 58210441,
    board: '/g/',
    title: 'Init systems, again',
};

function props() {
    return { thread: THREAD, maxCommentChars: 2000 };
}

beforeEach(() => {
    router.post.mockClear();
    router.visit.mockClear();
});

describe('Reply composer page', () => {
    /**
     * The thread is named on the screen an anon is writing into. A composer
     * that shows only an empty box asks them to remember what they opened it
     * from, and this screen replaced the one place that context was visible.
     */
    it('names the thread being replied to', () => {
        render(<Reply {...props()} />);

        expect(screen.getByText('Init systems, again')).toBeInTheDocument();
        expect(screen.getByText('/g/')).toBeInTheDocument();
    });

    /**
     * Post is disabled until there is something to post, which is the same
     * rule the server enforces: `body` is `required_without:media`, so an
     * empty submit is a round trip that can only fail.
     */
    it('disables Post until there is a body', async () => {
        const user = userEvent.setup();

        render(<Reply {...props()} />);

        const post = screen.getByRole('button', { name: 'Post' });
        expect(post).toBeDisabled();

        await user.type(
            screen.getByRole('textbox', { name: /reply/i }),
            'Mainline boots.',
        );

        expect(post).toBeEnabled();
    });

    /**
     * One submit path, and it is the route that already existed. The page is a
     * second surface onto `ReplyController::store`, not a second
     * implementation of replying.
     */
    it('posts to the thread it was opened from', async () => {
        const user = userEvent.setup();

        render(<Reply {...props()} />);

        await user.type(
            screen.getByRole('textbox', { name: /reply/i }),
            'Mainline boots.',
        );
        await user.click(screen.getByRole('button', { name: 'Post' }));

        expect(router.post).toHaveBeenCalledWith(
            '/g/58210441/replies',
            { body: 'Mainline boots.' },
            expect.anything(),
        );
    });

    /** Closing returns to the thread, not to wherever history happens to point. */
    it('closes back to the thread', () => {
        render(<Reply {...props()} />);

        expect(screen.getByRole('link', { name: /close/i })).toHaveAttribute(
            'href',
            '/g/58210441',
        );
    });
});
