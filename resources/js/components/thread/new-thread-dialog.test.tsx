import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { NewThreadDialog } from '@/components/thread/new-thread-dialog';
import { BOARDS } from '@/fixtures/clover';

/**
 * Radix Select drives its listbox with pointer capture and scroll APIs jsdom
 * does not implement. Stubbed exactly as `select.test.tsx` does, so the
 * board picker can actually open in these tests.
 */
beforeAll(() => {
    Element.prototype.hasPointerCapture = () => false;
    Element.prototype.setPointerCapture = () => {};
    Element.prototype.releasePointerCapture = () => {};
});

describe('NewThreadDialog', () => {
    it('lists every board as an option, showing both slug and name', async () => {
        const user = userEvent.setup();
        render(<NewThreadDialog open onOpenChange={() => {}} />);

        await user.click(screen.getByRole('combobox', { name: 'Board' }));

        const listbox = screen.getByRole('listbox');

        for (const board of BOARDS) {
            const option = within(listbox).getByRole('option', {
                name: new RegExp(
                    `${board.slug.replace(/\//g, '\\/')}.*${board.name}`,
                ),
            });
            expect(option).toBeInTheDocument();
        }
    });

    it('preselects defaultBoard in the trigger when given', () => {
        render(
            <NewThreadDialog open onOpenChange={() => {}} defaultBoard="/x/" />,
        );

        const trigger = screen.getByRole('combobox', { name: 'Board' });
        expect(trigger).toHaveTextContent('/x/');
        expect(trigger).toHaveTextContent('Paranormal');
    });

    it('keeps Post thread disabled until the body has content, then enables it', async () => {
        const user = userEvent.setup();
        render(<NewThreadDialog open onOpenChange={() => {}} />);

        const postButton = screen.getByRole('button', {
            name: 'Post thread',
        });
        expect(postButton).toBeDisabled();

        await user.type(
            screen.getByLabelText('Body'),
            'RISC-V laptops are finally usable.',
        );

        expect(postButton).toBeEnabled();
    });

    it('marks the subject field optional in a way assistive tech can read', () => {
        render(<NewThreadDialog open onOpenChange={() => {}} />);

        expect(
            screen.getByLabelText(/subject/i, { exact: false }),
        ).toHaveAccessibleName(/optional/i);
    });

    it('marks the body field required so assistive tech announces it', () => {
        render(<NewThreadDialog open onOpenChange={() => {}} />);

        expect(screen.getByLabelText('Body')).toBeRequired();
    });

    it('composes an honest attachment placeholder from a chosen file, never an <img>', async () => {
        const user = userEvent.setup();
        const { container } = render(
            <NewThreadDialog open onOpenChange={() => {}} />,
        );

        const file = new File(['pixel-bytes'], 'ridge-4k.png', {
            type: 'image/png',
        });
        Object.defineProperty(file, 'size', { value: 4_300_000 });

        await user.upload(screen.getByLabelText(/attachment/i), file);

        expect(
            screen.getByRole('img', {
                name: /ridge-4k\.png/,
            }),
        ).toBeInTheDocument();
        expect(container.querySelector('img')).not.toBeInTheDocument();
    });

    it('lets an anon remove a chosen attachment', async () => {
        const user = userEvent.setup();
        render(<NewThreadDialog open onOpenChange={() => {}} />);

        const file = new File(['pixel-bytes'], 'ridge-4k.png', {
            type: 'image/png',
        });
        await user.upload(screen.getByLabelText(/attachment/i), file);
        expect(
            screen.getByRole('img', { name: /ridge-4k\.png/ }),
        ).toBeInTheDocument();

        await user.click(
            screen.getByRole('button', { name: /remove attachment/i }),
        );

        expect(
            screen.queryByRole('img', { name: /ridge-4k\.png/ }),
        ).not.toBeInTheDocument();
    });

    it('posting calls onPost with the composed thread, and closes the dialog without a real submission', async () => {
        const user = userEvent.setup();
        const onPost = vi.fn();
        const onOpenChange = vi.fn();

        render(
            <NewThreadDialog
                open
                onOpenChange={onOpenChange}
                defaultBoard="/g/"
                onPost={onPost}
            />,
        );

        await user.type(
            screen.getByLabelText(/subject/i, { exact: false }),
            'Daily driver?',
        );
        await user.type(
            screen.getByLabelText('Body'),
            'Compiling LLVM takes forty minutes.',
        );
        await user.click(screen.getByRole('button', { name: 'Post thread' }));

        expect(onPost).toHaveBeenCalledWith(
            expect.objectContaining({
                board: '/g/',
                subject: 'Daily driver?',
                body: 'Compiling LLVM takes forty minutes.',
                attachment: null,
            }),
        );
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('closes without posting when Cancel is activated', async () => {
        const user = userEvent.setup();
        const onPost = vi.fn();
        const onOpenChange = vi.fn();

        render(
            <NewThreadDialog
                open
                onOpenChange={onOpenChange}
                onPost={onPost}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(onPost).not.toHaveBeenCalled();
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('renders nothing when closed', () => {
        render(<NewThreadDialog open={false} onOpenChange={() => {}} />);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('disables Post thread past the character limit and signals the overage by more than colour, matching ReplyComposer discipline', async () => {
        const user = userEvent.setup();
        render(<NewThreadDialog open onOpenChange={() => {}} />);

        const field = screen.getByLabelText('Body');
        const overLong = 'a'.repeat(2001);
        await user.click(field);
        await user.paste(overLong);

        expect(screen.getByText('2001/2000')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Post thread' }),
        ).toBeDisabled();
        expect(screen.getByText('Over the limit')).toBeInTheDocument();
    });

    it('never uses an em dash or double hyphen in its copy', () => {
        const { container } = render(
            <NewThreadDialog open onOpenChange={() => {}} />,
        );

        expect(container.textContent).not.toMatch(/—|--/);
    });
});
