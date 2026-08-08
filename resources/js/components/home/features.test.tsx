import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Features } from '@/components/home/features';

describe('Features', () => {
    it('renders the section heading', () => {
        render(<Features />);

        expect(
            screen.getByRole('heading', {
                level: 2,
                name: 'Built for reading, not for engagement',
            }),
        ).toBeInTheDocument();
    });

    it('renders all six feature titles', () => {
        render(<Features />);

        expect(
            screen.getByRole('heading', {
                level: 3,
                name: 'Anonymous by default',
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { level: 3, name: 'Fast on purpose' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', {
                level: 3,
                name: 'Blessings and curses',
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', {
                level: 3,
                name: 'Janitors, not bots',
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', {
                level: 3,
                name: 'Greentext preserved',
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', {
                level: 3,
                name: 'Boards, not follows',
            }),
        ).toBeInTheDocument();
    });

    it('renders each body verbatim', () => {
        render(<Features />);

        expect(
            screen.getByText(
                'Read any board without an account. Posting, commenting and blessing need one, and posts are still signed Anonymous.',
            ),
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                'No infinite feed, no autoplay, no tracking scripts. Threads render in one request.',
            ),
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                'Ranking is bump order plus blessings. No algorithmic timeline deciding what you read.',
            ),
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                'Every report is read by a human janitor with a scoped board list and a public action log.',
            ),
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                'You subscribe to subjects. Nobody accumulates an audience.',
            ),
        ).toBeInTheDocument();
    });

    /**
     * The greentext body contains a literal `>` character that must survive
     * into the DOM unescaped and unmodified.
     */
    it('keeps the literal > in the greentext body', () => {
        render(<Features />);

        const greentextBody = screen.getByText(
            (_content, element) =>
                element?.textContent ===
                'Markdown, quotes and >greentext work the way they always have.',
        );

        expect(greentextBody).toBeInTheDocument();
        expect(greentextBody.textContent).toContain('>greentext');
    });

    it('contains no em dashes anywhere in its rendered text', () => {
        const { container } = render(<Features />);

        expect(container.textContent).not.toMatch(/—|--/);
    });
});
