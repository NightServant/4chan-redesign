import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProfileCommentList } from '@/components/account/profile-comment-list';
import { PROFILE_COMMENTS } from '@/fixtures/clover';

describe('ProfileCommentList', () => {
    it('renders every reply with its board, parent thread and time', () => {
        render(<ProfileCommentList comments={PROFILE_COMMENTS} />);

        for (const comment of PROFILE_COMMENTS) {
            expect(screen.getByText(comment.body)).toBeInTheDocument();
            expect(
                screen.getByText(
                    `${comment.board} · reply to >>${comment.threadNo} · ${comment.time}`,
                ),
            ).toBeInTheDocument();
        }
    });

    it('renders a quoted line as greentext, prefixed with a chevron', () => {
        render(<ProfileCommentList comments={PROFILE_COMMENTS} />);

        expect(
            screen.getByText('>forty minutes is not "fine"'),
        ).toBeInTheDocument();
    });

    it('renders no quote line for a reply that quotes nothing', () => {
        const [, unquoted] = PROFILE_COMMENTS;

        render(<ProfileCommentList comments={[unquoted]} />);

        expect(screen.getByText(unquoted.body)).toBeInTheDocument();
        expect(screen.queryByText(/^>/)).not.toBeInTheDocument();
    });

    it('renders nothing but the list wrapper when there are no replies', () => {
        render(<ProfileCommentList comments={[]} />);

        expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    });
});
