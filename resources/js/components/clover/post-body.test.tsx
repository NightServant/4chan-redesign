import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PostBody } from '@/components/clover/post-body';

describe('PostBody', () => {
    it('renders a single line as its text', () => {
        render(<PostBody body="anons are still arguing about init systems" />);

        expect(
            screen.getByText('anons are still arguing about init systems'),
        ).toBeInTheDocument();
    });

    it('keeps every line of a multi-line post', () => {
        render(<PostBody body={'first line\nsecond line\nthird line'} />);

        expect(screen.getByText('first line')).toBeInTheDocument();
        expect(screen.getByText('second line')).toBeInTheDocument();
        expect(screen.getByText('third line')).toBeInTheDocument();
    });

    /**
     * The README promises greentext works. Before this component it did not:
     * a body was one `<p>` and a `>` line was indistinguishable from any
     * other.
     */
    it('marks a greentext line', () => {
        render(<PostBody body={'>be me\nordinary line'} />);

        expect(screen.getByText('>be me')).toHaveClass('text-primary');
        expect(screen.getByText('ordinary line')).not.toHaveClass(
            'text-primary',
        );
    });

    it('does not treat a post reference as greentext', () => {
        render(<PostBody body=">>109522303" />);

        expect(screen.getByText('>>109522303')).not.toHaveClass(
            'text-primary',
        );
    });

    /**
     * The whole security argument for this component. `com` is
     * attacker-influenced HTML upstream and is parsed to text before it is
     * stored, so anything tag-shaped that reaches here is literal text and
     * must render as literal text. No `dangerouslySetInnerHTML`, no script
     * element, no element at all.
     */
    it('renders markup-shaped text as text', () => {
        const { container } = render(
            <PostBody body={'<script>alert(1)</script>\n<img onerror=x>'} />,
        );

        expect(
            screen.getByText('<script>alert(1)</script>'),
        ).toBeInTheDocument();
        expect(screen.getByText('<img onerror=x>')).toBeInTheDocument();
        expect(container.querySelector('script')).toBeNull();
        expect(container.querySelector('img')).toBeNull();
    });

    it('collapses a run of blank lines rather than dropping or keeping them all', () => {
        const { container } = render(
            <PostBody body={'top\n\n\n\n\n\n\nbottom'} />,
        );

        const body = container.querySelector('[data-slot="post-body"]');

        expect(body?.childElementCount).toBe(3);
    });

    it('renders nothing for a body with no content', () => {
        const { container } = render(<PostBody body="" />);

        expect(
            container.querySelector('[data-slot="post-body"]'),
        ).toBeNull();
    });

    /**
     * Image-only posts are common and carry no comment at all, so this is an
     * ordinary case rather than a defensive one.
     */
    it('renders nothing for a whitespace-only body', () => {
        const { container } = render(<PostBody body={'   \n  \n'} />);

        expect(
            container.querySelector('[data-slot="post-body"]'),
        ).toBeNull();
    });

    it('allows long unbroken URLs to wrap instead of forcing the card wide', () => {
        const { container } = render(
            <PostBody body="https://example.com/an/extremely/long/path/that/never/breaks/anywhere" />,
        );

        expect(
            container.querySelector('[data-slot="post-body"]'),
        ).toHaveClass('break-words');
    });
});
