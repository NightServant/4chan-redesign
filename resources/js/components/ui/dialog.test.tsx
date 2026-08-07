import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

function renderDialog() {
    render(
        <Dialog>
            <DialogTrigger>Delete post</DialogTrigger>
            <DialogContent>
                <DialogTitle>Delete this post?</DialogTitle>
                <DialogDescription>
                    The post is removed from the thread. Replies quoting it keep
                    the reference number.
                </DialogDescription>
                <DialogFooter>
                    <Button variant="ghost">Cancel</Button>
                    <Button variant="danger">Delete</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>,
    );

    return screen.getByRole('button', { name: 'Delete post' });
}

describe('Dialog', () => {
    it('opens the panel when the trigger is activated', async () => {
        const user = userEvent.setup();
        const trigger = renderDialog();

        await user.click(trigger);

        expect(
            screen.getByRole('dialog', { name: 'Delete this post?' }),
        ).toBeInTheDocument();
    });

    it('closes on Escape and returns focus to the trigger', async () => {
        const user = userEvent.setup();
        const trigger = renderDialog();

        await user.click(trigger);
        expect(screen.getByRole('dialog')).toBeInTheDocument();

        await user.keyboard('{Escape}');

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
        expect(trigger).toHaveFocus();
    });

    it('closes when the close control is activated and returns focus to the trigger', async () => {
        const user = userEvent.setup();
        const trigger = renderDialog();

        await user.click(trigger);
        await user.click(screen.getByRole('button', { name: 'Close' }));

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
        expect(trigger).toHaveFocus();
    });

    it('gives the close control an accessible name', async () => {
        const user = userEvent.setup();
        const trigger = renderDialog();

        await user.click(trigger);

        expect(
            screen.getByRole('button', { name: 'Close' }),
        ).toBeInTheDocument();
    });

    it('renders the panel on the elevated surface with the overlay shadow and a 16px radius', async () => {
        const user = userEvent.setup();
        const trigger = renderDialog();

        await user.click(trigger);

        expect(screen.getByRole('dialog')).toHaveClass(
            'bg-surface-elevated',
            'border',
            'border-border',
            'rounded-2xl',
            'shadow-overlay',
        );
    });

    it('fades the scrim in with the scrim tint and blur tokens', async () => {
        const user = userEvent.setup();
        const trigger = renderDialog();

        await user.click(trigger);

        const overlay = document.querySelector('[data-slot="dialog-overlay"]');

        expect(overlay).toHaveClass('bg-scrim', 'backdrop-blur-scrim');
    });

    it('sets the title in the display font at the h3 size', async () => {
        const user = userEvent.setup();
        const trigger = renderDialog();

        await user.click(trigger);

        expect(screen.getByText('Delete this post?')).toHaveClass(
            'font-display',
            'text-h3',
            'font-semibold',
        );
    });

    it('sets the description in muted small body text', async () => {
        const user = userEvent.setup();
        const trigger = renderDialog();

        await user.click(trigger);

        expect(
            screen.getByText(/The post is removed from the thread/),
        ).toHaveClass('text-body-sm', 'text-muted-foreground');
    });
});
