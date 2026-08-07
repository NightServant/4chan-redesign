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
