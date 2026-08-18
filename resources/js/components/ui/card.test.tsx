import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

describe('Card', () => {
    /**
     * A card sits on the same drawn paper as the bands and the chrome, so it
     * reads as a piece of the page rather than a panel laid on top of one.
     */
    it('carries the dot matrix behind its content', () => {
        const { container } = render(<Card>Body</Card>);

        const paper = container.querySelector(
            '[data-slot="pattern-field-paper"]',
        );

        expect(paper).not.toBeNull();
        expect(paper).toHaveAttribute('aria-hidden', 'true');
        expect(container.querySelector('[data-slot="card"]')).toHaveTextContent(
            'Body',
        );
    });

    /**
     * The paper is a background layer, not a wrapper.
     *
     * `ProfileCommentList` renders `<Card className="gap-0 py-0">` and relies
     * on those landing on the card itself. Wrapping the children in the
     * pattern field would have left the caller's layout classes on an outer
     * box with nothing to lay out, and the list would have silently regained
     * the padding it removes on purpose.
     */
    it('layers the paper behind its children rather than wrapping them', () => {
        const { container } = render(<Card className="gap-0 py-0">Body</Card>);

        const card = container.querySelector('[data-slot="card"]');
        const field = container.querySelector('[data-slot="pattern-field"]');

        /* The caller's layout classes land on the card, and the card is what
           lays the children out -- so the children must be the card's own,
           not the field's. Wrapping them would leave `gap-0 py-0` on a box
           with nothing left to lay out. */
        expect(card).toHaveClass('gap-0');
        expect(card).toHaveClass('py-0');
        expect(field?.textContent).toBe('');
        expect(
            Array.from(card?.childNodes ?? []).some(
                (node) => node.textContent === 'Body',
            ),
        ).toBe(true);
    });

    it('renders its children', () => {
        render(<Card>Thread summary</Card>);

        expect(screen.getByText('Thread summary')).toBeInTheDocument();
    });

    it('is a hairline bordered surface with the large radius', () => {
        render(<Card data-testid="card">Body</Card>);

        const card = screen.getByTestId('card');

        expect(card).toHaveClass(
            'border',
            'border-border',
            'bg-surface',
            'rounded-xl',
        );
        expect(card).toHaveClass('text-body', 'text-foreground');
    });

    it('rests without a shadow', () => {
        render(<Card data-testid="card">Body</Card>);

        expect(screen.getByTestId('card').className).not.toMatch(
            /(^|\s)shadow-/,
        );
    });

    it('does not lift or strengthen its border by default', () => {
        render(<Card data-testid="card">Body</Card>);

        const className = screen.getByTestId('card').className;

        expect(className).not.toContain('hover:border-border-strong');
        expect(className).not.toContain('-translate-y-px');
    });

    it('lifts with transform only when hoverLift is set', () => {
        render(
            <Card hoverLift data-testid="card">
                Body
            </Card>,
        );

        const className = screen.getByTestId('card').className;

        expect(className).toContain('hover:border-border-strong');
        expect(className).toContain('hover:-translate-y-px');
        expect(className).toContain('transition-');
        expect(className).not.toMatch(/hover:(m[trbl]?|top|h|w)-/);
    });

    it('renders header, title, description, content and footer sections', () => {
        render(
            <Card>
                <CardHeader>
                    <CardTitle>Board rules</CardTitle>
                    <CardDescription>Read before posting</CardDescription>
                </CardHeader>
                <CardContent>No doxxing</CardContent>
                <CardFooter>Last updated by a janitor</CardFooter>
            </Card>,
        );

        expect(screen.getByText('Board rules')).toBeInTheDocument();
        expect(screen.getByText('Read before posting')).toHaveClass(
            'text-muted-foreground',
        );
        expect(screen.getByText('No doxxing')).toBeInTheDocument();
        expect(
            screen.getByText('Last updated by a janitor'),
        ).toBeInTheDocument();
    });

    it('merges consumer classes over the defaults', () => {
        render(
            <Card className="rounded-2xl" data-testid="card">
                Body
            </Card>,
        );

        const card = screen.getByTestId('card');

        expect(card).toHaveClass('rounded-2xl');
        expect(card).not.toHaveClass('rounded-xl');
    });
});
