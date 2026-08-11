import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OriginalPost } from '@/components/thread/original-post';
import { makeAttachment, makeThread } from '@/fixtures/factories';
import { board } from '@/routes';

/**
 * `Link` needs a real Inertia page context this test does not have. Mirrors
 * the double `app-sidebar.test.tsx` uses: a plain anchor, still queryable by
 * role and accessible name.
 */
vi.mock('@inertiajs/react', () => ({
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

/* Built rather than picked out of a shared list, so each constant states the
   one property its tests are about instead of depending on which fixture row
   happened to have it. */
const THREAD = makeThread({
    no: 58210441,
    excerpt: 'Compiling LLVM takes 40 minutes but everything else is fine.',
});
const PINNED_THREAD = makeThread({ pinned: true });
const MEDIA_THREAD = makeThread({ media: makeAttachment() });

function stubClipboard() {
    Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: vi.fn().mockResolvedValue(undefined) },
        configurable: true,
    });
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('OriginalPost', () => {
    it('renders the thread title as the page h1', () => {
        render(<OriginalPost thread={THREAD} />);

        expect(
            screen.getByRole('heading', { level: 1, name: THREAD.title }),
        ).toBeInTheDocument();
    });

    it('renders the post number in ">>" form', () => {
        render(<OriginalPost thread={THREAD} />);

        expect(screen.getByText(`>>${THREAD.no}`)).toBeInTheDocument();
    });

    it('links the board slug and name to the board route', () => {
        render(<OriginalPost thread={THREAD} />);

        const link = screen.getByRole('link', {
            name: `${THREAD.board} ${THREAD.boardName}`,
        });

        expect(link).toHaveAttribute('href', board({ board: 'g' }).url);
    });

    it('renders the excerpt as body copy', () => {
        render(<OriginalPost thread={THREAD} />);

        expect(screen.getByText(THREAD.excerpt!)).toBeInTheDocument();
    });

    it('shows a Pinned badge for a pinned thread and none for an unpinned one', () => {
        const { rerender } = render(<OriginalPost thread={PINNED_THREAD} />);
        expect(screen.getByText('Pinned')).toBeInTheDocument();

        rerender(<OriginalPost thread={THREAD} />);
        expect(screen.queryByText('Pinned')).not.toBeInTheDocument();
    });

    /**
     * The inverse of what this asserted before. Media was metadata and there
     * was no file to point at, so the OP rendered a labelled placeholder and a
     * real `<img>` would have meant something was invented. There is a file
     * now, and the rule it protected moved rather than went away: still only
     * what 4chan reported, still nothing estimated.
     */
    /**
     * The full file, not the thumbnail. This is the thread being read, and
     * 4chan caps an OP's thumbnail at 250px on the long side — big enough to
     * identify an image, not to look at one.
     */
    it('renders the full attachment when the thread has one', () => {
        render(<OriginalPost thread={MEDIA_THREAD} />);

        const media = MEDIA_THREAD.media!;
        const image = screen.getByRole('img', { name: media.filename });

        expect(image).toHaveAttribute('src', media.fullUrl);
        expect(image).not.toHaveAttribute('src', media.thumbnailUrl);
    });

    it('renders no attachment when media is null', () => {
        render(<OriginalPost thread={THREAD} />);

        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('shows the blessing count, reply count and image count in the footer', () => {
        render(<OriginalPost thread={THREAD} />);

        expect(screen.getByText(String(THREAD.blessings))).toBeInTheDocument();
        expect(screen.getByText(String(THREAD.replies))).toBeInTheDocument();
        expect(screen.getByText(THREAD.images)).toBeInTheDocument();
    });

    it('fires onBless and onCurse from the vote control', async () => {
        const user = userEvent.setup();
        const onBless = vi.fn();
        const onCurse = vi.fn();

        render(
            <OriginalPost
                thread={THREAD}
                onBless={onBless}
                onCurse={onCurse}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Bless this post' }),
        );
        await user.click(
            screen.getByRole('button', { name: 'Curse this post' }),
        );

        expect(onBless).toHaveBeenCalledTimes(1);
        expect(onCurse).toHaveBeenCalledTimes(1);
    });

    it('fires onBookmark and reflects bookmarked state without relying on colour alone', async () => {
        const user = userEvent.setup();
        const onBookmark = vi.fn();

        const { rerender } = render(
            <OriginalPost thread={THREAD} onBookmark={onBookmark} />,
        );

        const button = screen.getByRole('button', { name: 'Bookmark thread' });
        expect(button).toHaveAttribute('aria-pressed', 'false');

        await user.click(button);
        expect(onBookmark).toHaveBeenCalledTimes(1);

        rerender(
            <OriginalPost thread={THREAD} onBookmark={onBookmark} bookmarked />,
        );
        expect(
            screen.getByRole('button', { name: 'Bookmark thread' }),
        ).toHaveAttribute('aria-pressed', 'true');
    });

    it('copies the current URL to the clipboard when Share is pressed', async () => {
        const user = userEvent.setup();
        stubClipboard();

        render(<OriginalPost thread={THREAD} />);

        await user.click(
            screen.getByRole('button', { name: 'Copy link to this thread' }),
        );

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
            window.location.href,
        );
    });

    it('does not render a Card or Panel surface around the post', () => {
        const { container } = render(<OriginalPost thread={THREAD} />);

        expect(
            container.querySelector('[data-slot="card"]'),
        ).not.toBeInTheDocument();
        expect(
            container.querySelector('[data-slot="panel"]'),
        ).not.toBeInTheDocument();
    });

    it('separates the post from what follows with a hairline, not a card', () => {
        const { container } = render(<OriginalPost thread={THREAD} />);

        const root = container.querySelector('[data-slot="original-post"]');
        expect(root).toHaveClass('border-b');
    });
});
