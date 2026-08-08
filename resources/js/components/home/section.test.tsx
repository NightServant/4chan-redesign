import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Section } from '@/components/home/section';

describe('Section', () => {
    it('exposes itself as a region named by its heading', () => {
        render(
            <Section
                id="boards"
                label="Popular boards"
                title="74 boards, one interface"
            >
                <p>Content</p>
            </Section>,
        );

        expect(
            screen.getByRole('region', { name: '74 boards, one interface' }),
        ).toBeInTheDocument();
    });

    it('renders the title as a second-level heading', () => {
        render(
            <Section id="features" label="Features" title="Built for reading">
                <p>Content</p>
            </Section>,
        );

        expect(
            screen.getByRole('heading', {
                level: 2,
                name: 'Built for reading',
            }),
        ).toBeInTheDocument();
    });

    it('carries an id so the nav can link to it', () => {
        const { container } = render(
            <Section id="how" label="How Clover works" title="Three steps">
                <p>Content</p>
            </Section>,
        );

        expect(container.querySelector('section#how')).toBeInTheDocument();
    });

    it('renders its children', () => {
        render(
            <Section
                id="trending"
                label="Trending"
                title="What is bumped today"
            >
                <p>Thread list</p>
            </Section>,
        );

        expect(screen.getByText('Thread list')).toBeInTheDocument();
    });

    it('renders an action alongside the heading when given one', () => {
        render(
            <Section
                id="trending"
                label="Trending"
                title="What is bumped today"
                action={<button type="button">Open the feed</button>}
            >
                <p>Thread list</p>
            </Section>,
        );

        expect(
            screen.getByRole('button', { name: 'Open the feed' }),
        ).toBeInTheDocument();
    });

    /**
     * Sections are separated by a hairline rule rather than alternating
     * background fills, which is what keeps the page reading as one surface.
     */
    it('separates itself with a hairline rather than a filled band', () => {
        const { container } = render(
            <Section id="features" label="Features" title="Built for reading">
                <p>Content</p>
            </Section>,
        );

        const section = container.querySelector('section');

        expect(section?.className).toContain('border-t');
        expect(section?.className).not.toMatch(/\bbg-(surface|primary)\b/);
    });
});
