import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProfileCommentList } from '@/components/account/profile-comment-list';
import { makeProfileComment } from '@/fixtures/factories';

const PROFILE_COMMENTS = [
    makeProfileComment({
        body: 'Forty minutes for LLVM is not "fine".',
        quoted: 'forty minutes is not "fine"',
    }),
    makeProfileComment({ body: 'Mainline boots but the GPU does nothing.' }),
];

afterEach(() => {
    vi.restoreAllMocks();
});

describe('ProfileCommentList', () => {
    /**
     * A post number is unique to its board, not to the site.
     *
     * `LocalPostNumbers::BASE` is 9,000,000,000 and the sequence is per board,
     * exactly as 4chan's own numbering is — so the first reply this anon
     * writes on /g/ and the first they write on /co/ are *both* numbered
     * 9000000000. Keying the list on `no` alone gave React two children with
     * the same key, which it is free to duplicate or drop; the real
     * `/account` screen has been logging that error to `browser.log`.
     *
     * The board is what disambiguates, and it is already on the row.
     */
    it('keys rows so two boards can share a post number', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});

        const collided = [
            makeProfileComment({
                no: 9_000_000_000,
                board: '/g/',
                body: 'First reply on /g/.',
            }),
            makeProfileComment({
                no: 9_000_000_000,
                board: '/co/',
                body: 'First reply on /co/.',
            }),
        ];

        render(<ProfileCommentList comments={collided} />);

        expect(screen.getByText('First reply on /g/.')).toBeInTheDocument();
        expect(screen.getByText('First reply on /co/.')).toBeInTheDocument();
        /* Every argument of every call, since React's warning puts the key in
           a `%s` argument rather than in the message, and the arity has
           changed between versions. */
        const warnings = error.mock.calls
            .flat()
            .filter(
                (argument): argument is string => typeof argument === 'string',
            )
            .join(' ');

        expect(warnings).not.toContain('same key');
    });

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
