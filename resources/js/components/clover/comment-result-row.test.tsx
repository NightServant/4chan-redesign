import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CommentResultRow } from '@/components/clover/comment-result-row';
import { makeAttachment, makeCommentResult } from '@/fixtures/factories';

/** `href` survives the double, so a row that links nowhere fails here. */
vi.mock('@inertiajs/react', () => ({
    Link: ({
        href,
        children,
        ...props
    }: { href: string; children: ReactNode } & Record<string, unknown>) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

describe('CommentResultRow', () => {
    it('shows where the reply lives, what it answers, and what it says', () => {
        render(
            <CommentResultRow
                comment={makeCommentResult({
                    board: '/g/',
                    threadTitle: 'RISC-V laptops',
                    body: 'The toolchain is the hard part.',
                    time: '7 hr ago',
                })}
            />,
        );

        expect(screen.getByText('/g/')).toBeInTheDocument();
        expect(screen.getByText('7 hr ago')).toBeInTheDocument();
        expect(screen.getByText('RISC-V laptops')).toBeInTheDocument();
        expect(
            screen.getByText('The toolchain is the hard part.'),
        ).toBeInTheDocument();
    });

    /** Straight to the reply on the thread page, which anchors on `#p{no}`. */
    it('links to the reply itself, not merely to the thread', () => {
        render(
            <CommentResultRow
                comment={makeCommentResult({
                    board: '/g/',
                    threadNo: 58210441,
                    no: 58210500,
                    threadTitle: 'RISC-V laptops',
                })}
            />,
        );

        expect(
            screen.getByRole('link', { name: /RISC-V laptops/ }),
        ).toHaveAttribute('href', '/g/58210441#p58210500');
    });

    it('marks a reply from a board 4chan calls not worksafe', () => {
        render(
            <CommentResultRow comment={makeCommentResult({ nsfw: true })} />,
        );

        expect(screen.getByText('NSFW')).toBeInTheDocument();
    });

    it('draws the attachment as a thumbnail beside the row', () => {
        render(
            <CommentResultRow
                comment={makeCommentResult({ media: makeAttachment() })}
            />,
        );

        expect(screen.getByRole('presentation')).toHaveAttribute(
            'src',
            'https://i.4cdn.org/g/1745612650141704s.jpg',
        );
    });

    /**
     * No votes, no score, no invented figure. What the meta line may carry is
     * what this application counts.
     */
    it('reports no figure this application cannot count', () => {
        render(<CommentResultRow comment={makeCommentResult()} />);

        for (const invented of [/upvote/i, /\bscore\b/i, /\bpoints\b/i]) {
            expect(screen.queryByText(invented)).not.toBeInTheDocument();
        }
    });
});
