import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Problem } from '@/components/home/problem';

const POINTS = [
    'A thread is one flat column. Who answered whom lives in >>numbers you follow by hand.',
    'Reading happens one board at a time, from a paged index or a grid of thumbnails.',
    'The default skins are the original beige and blue, and every board uses the same dense layout.',
];

describe('Problem', () => {
    it('is a band named by the problem it states', () => {
        const { container } = render(<Problem />);

        expect(
            screen.getByRole('region', {
                name: 'Good boards, an old way to read them',
            }),
        ).toBeInTheDocument();
        expect(container.querySelector('section#problem')).toBeInTheDocument();
        expect(container.textContent).toContain('The problem');
    });

    it('states the three points as plain paragraphs, in order', () => {
        const { container } = render(<Problem />);

        const paragraphs = [
            ...container.querySelectorAll('section#problem p'),
        ].map((paragraph) => paragraph.textContent);

        expect(paragraphs).toEqual(POINTS);
    });

    /**
     * The points are sentences, not a list of labelled claims, so there is no
     * lead-in to bold and no extra heading to skip a level for.
     */
    it('has no bolded lead-ins and no headings below the title', () => {
        const { container } = render(<Problem />);

        expect(container.querySelector('strong, b')).toBeNull();
        expect(screen.queryAllByRole('heading', { level: 3 })).toEqual([]);
    });
});
