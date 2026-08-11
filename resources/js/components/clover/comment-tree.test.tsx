import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CommentTree } from '@/components/clover/comment-tree';
import type { Comment } from '@/types/clover';

/** Finds the `<article>` for a comment by its own post number. Scoping
 * queries to this element (rather than its `<li>`) excludes that comment's
 * nested replies, which live in the DOM as a sibling of the article, not
 * inside it — so a query like "does this row say OP" cannot accidentally
 * match a descendant reply's own OP badge. */
function articleFor(no: number): HTMLElement {
    return screen.getByRole('article', { name: new RegExp(String(no)) });
}

/** The full row for a comment, including its nested replies — the `<li>`
 * that contains both the `<article>` and the sibling list of children. Used
 * only when a query needs to reach outside the article itself, e.g. the
 * "Continue this thread" affordance that replaces the nested list. */
function rowFor(no: number): HTMLElement {
    const row = articleFor(no).closest('li');

    if (!row) {
        throw new Error(`Expected an <li> ancestor for comment ${no}`);
    }

    return row;
}

/**
 * The reply tree these tests assert against.
 *
 * It was a shared design fixture until the backend landed. Comments come from
 * the server now, so it lives here instead — it is test data, and every
 * assertion below is about this exact shape: the depth cap, the descendant
 * counts and the collapse behaviour are all read off it.
 */
const COMMENTS: readonly Comment[] = [
    {
        no: 58210447,
        quotes: [],
        author: 'Anonymous',
        time: '3 min ago',
        body: 'Forty minutes for LLVM is not "fine", that is a full coffee break per build. What is the core count?',
        blessings: 214,
        op: false,
        media: null,
        replies: [
            {
                no: 58210452,
                quotes: [58210447],
                author: 'Anonymous',
                time: '2 min ago',
                body: 'Eight cores, 16 GB. It is not fast, it is usable. Those are different claims.',
                blessings: 388,
                op: true,
                media: null,
                replies: [
                    {
                        no: 58210461,
                        quotes: [58210452],
                        author: 'Anonymous',
                        time: '1 min ago',
                        body: 'Fair. What is battery like under sustained load?',
                        blessings: 42,
                        op: false,
                        media: null,
                        replies: [],
                    },
                ],
            },
            {
                no: 58210455,
                quotes: [58210447],
                author: 'Anonymous',
                time: '2 min ago',
                body: 'Cross compile on an x86 box and rsync the artifacts. Nobody builds LLVM natively on these.',
                blessings: 156,
                op: false,
                media: null,
                replies: [],
            },
        ],
    },
    {
        no: 58210449,
        quotes: [],
        author: 'Anonymous',
        time: '2 min ago',
        body: 'Mainline kernel support or vendor tree? This is the only question that matters and every one of these threads dodges it.',
        blessings: 512,
        op: false,
        media: null,
        replies: [
            {
                no: 58210458,
                quotes: [58210449],
                author: 'Anonymous',
                time: '1 min ago',
                body: 'Vendor tree, 6.6 based. Mainline boots but the GPU does nothing.',
                blessings: 297,
                op: true,
                media: null,
                replies: [],
            },
        ],
    },
    {
        no: 58210463,
        quotes: [],
        author: 'Anonymous',
        time: 'just now',
        body: 'Bought one in April and returned it in May. Your mileage will vary wildly by workload.',
        blessings: 8,
        op: false,
        media: null,
        replies: [],
    },
];

describe('CommentTree', () => {
    it('renders the whole fixture with its nesting intact', () => {
        render(<CommentTree comments={COMMENTS} />);

        // Top-level, depth 2 and depth 3 replies from the fixture should all
        // be present at once, proving recursion actually walked the tree
        // rather than stopping after the first level.
        expect(
            screen.getByText(/Forty minutes for LLVM is not "fine"/),
        ).toBeInTheDocument();
        expect(
            screen.getByText(/Eight cores, 16 GB\. It is not fast/),
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                /Fair\. What is battery like under sustained load\?/,
            ),
        ).toBeInTheDocument();
    });

    it('exposes real list semantics rather than nested divs', () => {
        render(<CommentTree comments={COMMENTS} />);

        // One list for the top level, plus one nested list per comment that
        // has replies (58210447, 58210452 and 58210449 in the fixture).
        const lists = screen.getAllByRole('list');

        expect(lists.length).toBeGreaterThan(1);

        // Every comment in the fixture, at every depth, is its own list item:
        // 58210447, 58210452, 58210461, 58210455, 58210449, 58210458, 58210463.
        expect(screen.getAllByRole('listitem')).toHaveLength(7);
    });

    it("renders a reply's quotes as focusable references naming the post they quote", () => {
        render(<CommentTree comments={COMMENTS} />);

        // 58210458 is the only reply that quotes 58210449, so this reference
        // is unambiguous in the rendered tree.
        const quoteRef = within(articleFor(58210458)).getByRole('button', {
            name: '>>58210449',
        });

        expect(quoteRef.tagName).toBe('BUTTON');
    });

    it('calls onQuoteClick with the quoted post number when a quote reference is pressed', async () => {
        const onQuoteClick = vi.fn();

        render(<CommentTree comments={COMMENTS} onQuoteClick={onQuoteClick} />);

        await userEvent.click(
            within(articleFor(58210458)).getByRole('button', {
                name: '>>58210449',
            }),
        );

        expect(onQuoteClick).toHaveBeenCalledWith(58210449, expect.anything());
    });

    it('marks OP on the OP reply and not on the others', () => {
        render(<CommentTree comments={COMMENTS} />);

        // 58210452 is the only reply flagged `op: true` in the fixture.
        expect(
            within(articleFor(58210452)).getByText('OP'),
        ).toBeInTheDocument();
        expect(
            within(articleFor(58210447)).queryByText('OP'),
        ).not.toBeInTheDocument();
    });

    it('collapses a reply, hiding its body and descendants, and exposes aria-expanded', async () => {
        const user = userEvent.setup();

        render(<CommentTree comments={COMMENTS} />);

        // Collapse the first top-level comment (58210447), which has two
        // replies (58210452 and 58210455), one of which (58210452) has its
        // own nested reply (58210461) — 3 descendants total.
        const toggle = within(articleFor(58210447)).getByRole('button', {
            name: /collapse post 58210447/i,
        });

        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        expect(
            screen.getByText(/Eight cores, 16 GB\. It is not fast/),
        ).toBeInTheDocument();

        await user.click(toggle);

        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        expect(
            screen.queryByText(/Eight cores, 16 GB\. It is not fast/),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByText(/Fair\. What is battery like/),
        ).not.toBeInTheDocument();

        // The collapsed row still tells you what it hid, not just that it
        // collapsed.
        expect(
            within(articleFor(58210447)).getByText(/3 replies hidden/i),
        ).toBeInTheDocument();
    });

    it('stops indenting past maxDepth and offers a continue affordance instead', () => {
        render(<CommentTree comments={COMMENTS} maxDepth={2} />);

        // 58210452 sits at depth 2. Its child 58210461 would sit at depth 3,
        // past the cap, so it should not be rendered as a nested list item.
        expect(
            screen.queryByText(/Fair\. What is battery like/),
        ).not.toBeInTheDocument();

        expect(
            within(rowFor(58210452)).getByRole('button', {
                name: /continue this thread/i,
            }),
        ).toBeInTheDocument();
    });

    it('does not cap depth for the default maxDepth against a three-deep fixture', () => {
        render(<CommentTree comments={COMMENTS} />);

        expect(
            screen.queryByRole('button', { name: /continue this thread/i }),
        ).not.toBeInTheDocument();
    });

    it('calls onReply with the comment when its reply affordance is pressed', async () => {
        const onReply = vi.fn();
        const leaf: Comment = COMMENTS[2];

        render(<CommentTree comments={COMMENTS} onReply={onReply} />);

        const replyButton = within(articleFor(leaf.no)).getByRole('button', {
            name: /reply/i,
        });

        await userEvent.click(replyButton);

        expect(onReply).toHaveBeenCalledWith(leaf);
    });

    it('renders nothing for an empty comment list', () => {
        const { container } = render(<CommentTree comments={[]} />);

        expect(container).toBeEmptyDOMElement();
    });
});
