import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DeleteUser from '@/components/delete-user';

/**
 * The mock renders a real `form` and echoes the action back as data
 * attributes, so the test can hold the destroy route steady without a server.
 * `method` is spelled `data-method` because jsdom normalises the real form
 * attribute and would hide a regression rather than report one.
 */
const { formState } = vi.hoisted(() => ({
    formState: {
        processing: false,
        errors: {} as Record<string, string>,
        resetAndClearErrors: vi.fn(),
    },
}));

vi.mock('@inertiajs/react', () => ({
    Form: ({
        children,
        action,
        method,
    }: {
        children: (state: typeof formState) => ReactNode;
        action?: string;
        method?: string;
    } & Record<string, unknown>) => (
        <form
            action={action}
            data-method={method}
            data-testid="delete-user-form"
        >
            {children(formState)}
        </form>
    ),
}));

async function openDialog(): Promise<void> {
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Delete account' }));
}

beforeEach(() => {
    formState.processing = false;
    formState.errors = {};
    formState.resetAndClearErrors.mockClear();
});

describe('DeleteUser', () => {
    it('says what deletion does and what it leaves behind', () => {
        render(<DeleteUser />);

        expect(screen.getByText(/permanent/i)).toBeInTheDocument();
        expect(screen.getByText(/anonymous/i)).toBeInTheDocument();
    });

    it('keeps the trigger hook the account flow is driven from', () => {
        render(<DeleteUser />);

        expect(
            screen.getByRole('button', { name: 'Delete account' }),
        ).toHaveAttribute('data-test', 'delete-user-button');
    });

    it('asks for the password before it will delete anything', async () => {
        render(<DeleteUser />);

        expect(screen.queryByLabelText('Password')).toBeNull();

        await openDialog();

        expect(screen.getByLabelText('Password')).toHaveAttribute(
            'name',
            'password',
        );
    });

    it('posts the confirmation to the profile destroy action', async () => {
        render(<DeleteUser />);

        await openDialog();

        const form = screen.getByTestId('delete-user-form');

        expect(form).toHaveAttribute(
            'action',
            '/settings/profile?_method=DELETE',
        );
        expect(form).toHaveAttribute('data-method', 'post');
    });

    it('keeps the confirm hook and marks it destructive', async () => {
        render(<DeleteUser />);

        await openDialog();

        const confirm = screen.getByRole('button', {
            name: 'Delete permanently',
        });

        expect(confirm).toHaveAttribute(
            'data-test',
            'confirm-delete-user-button',
        );
        expect(confirm).toHaveAttribute('type', 'submit');
        expect(confirm.className).toContain('bg-danger');
    });

    it('announces a wrong password against the control', async () => {
        formState.errors = { password: 'The password is incorrect.' };

        render(<DeleteUser />);

        await openDialog();

        expect(screen.getByRole('alert')).toHaveTextContent(
            'The password is incorrect.',
        );
        expect(screen.getByLabelText('Password')).toHaveAttribute(
            'aria-invalid',
            'true',
        );
    });

    it('clears the form when the anon backs out', async () => {
        const user = userEvent.setup();

        render(<DeleteUser />);

        await openDialog();
        await user.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(formState.resetAndClearErrors).toHaveBeenCalled();
    });
});
