import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '@/components/ui/button';

describe('Button', () => {
    it('renders its children inside a button element', () => {
        render(<Button>Bless post</Button>);

        expect(
            screen.getByRole('button', { name: 'Bless post' }),
        ).toBeInTheDocument();
    });

    it('defaults to the primary variant at medium size', () => {
        render(<Button>Reply</Button>);

        const button = screen.getByRole('button', { name: 'Reply' });

        expect(button).toHaveClass('bg-primary', 'text-primary-foreground');
        expect(button).toHaveClass('text-body-sm');
        expect(button).toHaveClass('h-9.5');
        expect(button).toHaveClass('rounded-md');
    });

    it('lightens on hover and darkens plus scales down on press', () => {
        render(<Button>Bump</Button>);

        const button = screen.getByRole('button', { name: 'Bump' });

        expect(button.className).toMatch(/hover:[\w:-]*bg-primary-hover/);
        expect(button.className).toMatch(/active:[\w:-]*bg-primary-pressed/);
        expect(button.className).toMatch(/active:[\w:-]*scale-\[0\.98\]/);
    });

    it('renders the outline variant as a bordered transparent control', () => {
        render(<Button variant="outline">Report</Button>);

        const button = screen.getByRole('button', { name: 'Report' });

        expect(button).toHaveClass('border-border-strong', 'bg-transparent');
        expect(button).not.toHaveClass('bg-primary');
        expect(button.className).toMatch(/hover:[\w:-]*bg-surface-hover/);
    });

    it('renders the ghost variant with no border and a hover surface', () => {
        render(<Button variant="ghost">Hide</Button>);

        const button = screen.getByRole('button', { name: 'Hide' });

        expect(button).toHaveClass('bg-transparent');
        expect(button).not.toHaveClass('border-border-strong');
        expect(button.className).toMatch(/hover:[\w:-]*bg-surface-hover/);
    });

    it('renders the danger variant on the danger surface', () => {
        render(<Button variant="danger">Curse</Button>);

        const button = screen.getByRole('button', { name: 'Curse' });

        expect(button).toHaveClass('bg-danger');
        expect(button).not.toHaveClass('bg-primary');
    });

    it.each([
        ['sm', 'h-8.5'],
        ['md', 'h-9.5'],
        ['lg', 'h-11'],
    ] as const)('applies the %s size height', (size, expected) => {
        render(<Button size={size}>Sized</Button>);

        expect(screen.getByRole('button', { name: 'Sized' })).toHaveClass(
            expected,
        );
    });

    it('renders a full pill when the pill prop is set', () => {
        render(<Button pill>Trending</Button>);

        const button = screen.getByRole('button', { name: 'Trending' });

        expect(button).toHaveClass('rounded-full');
        expect(button).not.toHaveClass('rounded-md');
    });

    it('shows a disabled control at 60% opacity with a not-allowed cursor', async () => {
        const onClick = vi.fn();

        render(
            <Button disabled onClick={onClick}>
                Post
            </Button>,
        );

        const button = screen.getByRole('button', { name: 'Post' });

        expect(button).toBeDisabled();
        expect(button).toHaveClass(
            'disabled:opacity-60',
            'disabled:cursor-not-allowed',
        );

        await userEvent.click(button);
        expect(onClick).not.toHaveBeenCalled();
    });

    it('calls the click handler when pressed', async () => {
        const onClick = vi.fn();

        render(<Button onClick={onClick}>Bless</Button>);

        await userEvent.click(screen.getByRole('button', { name: 'Bless' }));

        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('renders as the child element when asChild is set', () => {
        render(
            <Button asChild variant="outline">
                <a href="/g/">Browse /g/</a>
            </Button>,
        );

        const link = screen.getByRole('link', { name: 'Browse /g/' });

        expect(link).toHaveAttribute('href', '/g/');
        expect(link).toHaveClass('border-border-strong');
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('keeps the legacy shadcn variant names working for existing pages', () => {
        render(
            <>
                <Button variant="default">Default</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="secondary">Secondary</Button>
                <Button size="icon" aria-label="Icon action" />
            </>,
        );

        expect(screen.getByRole('button', { name: 'Default' })).toHaveClass(
            'bg-primary',
        );
        expect(screen.getByRole('button', { name: 'Destructive' })).toHaveClass(
            'bg-danger',
        );
        expect(screen.getByRole('button', { name: 'Secondary' })).toHaveClass(
            'bg-surface-elevated',
        );
        expect(screen.getByRole('button', { name: 'Icon action' })).toHaveClass(
            'size-9.5',
        );
    });

    it('never removes the focus outline', () => {
        render(<Button>Focusable</Button>);

        expect(
            screen.getByRole('button', { name: 'Focusable' }).className,
        ).not.toContain('outline-none');
    });

    /**
     * `delete-user.tsx` composes this button as `<DialogClose asChild><Button>`,
     * which only closes the dialog if the ref reaches the underlying element.
     * React 19 hands `ref` to function components as an ordinary prop, so the
     * rest spread carries it without `forwardRef` — these two tests prove that
     * holds on both the plain and the `asChild` path rather than assuming it.
     */
    it('forwards a ref to the underlying button element', () => {
        const ref = { current: null as HTMLButtonElement | null };

        render(<Button ref={ref}>Delete account</Button>);

        expect(ref.current).toBe(
            screen.getByRole('button', { name: 'Delete account' }),
        );
    });

    it('forwards a ref through asChild to the slotted element', () => {
        // Typed to Button's own ref, which is what a caller actually writes.
        // At runtime Slot hands it to the anchor, so the assertion below
        // compares it against the link element.
        const ref = { current: null as HTMLButtonElement | null };

        // The ref goes on Button, not on the anchor. A ref written directly on
        // the child would be delivered by React no matter what Button did,
        // which would make this test pass even with forwarding broken.
        render(
            <Button asChild ref={ref}>
                <a href="/boards">Browse boards</a>
            </Button>,
        );

        expect(ref.current).toBe(
            screen.getByRole('link', { name: 'Browse boards' }),
        );
    });
});
