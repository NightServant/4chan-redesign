import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PasskeyRegistration from '@/components/passkey-register';

const { registerState, register } = vi.hoisted(() => ({
    register: vi.fn(),
    registerState: {
        isLoading: false,
        error: undefined as string | undefined,
        isSupported: true,
    },
}));

vi.mock('@laravel/passkeys/react', () => ({
    usePasskeyRegister: () => ({ ...registerState, register }),
}));

const onSuccess = vi.fn();

beforeEach(() => {
    register.mockReset();
    onSuccess.mockClear();
    registerState.isLoading = false;
    registerState.error = undefined;
    registerState.isSupported = true;
});

describe('PasskeyRegistration', () => {
    it('says so plainly when the browser cannot do passkeys', () => {
        registerState.isSupported = false;

        render(<PasskeyRegistration onSuccess={onSuccess} />);

        expect(
            screen.getByText('Passkeys are not supported in this browser.'),
        ).toBeInTheDocument();
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('starts as a single action, not an open form', () => {
        render(<PasskeyRegistration onSuccess={onSuccess} />);

        expect(
            screen.getByRole('button', { name: 'Add passkey' }),
        ).toBeInTheDocument();
        expect(screen.queryByLabelText('Passkey name')).toBeNull();
    });

    it('opens a labelled name field when asked', async () => {
        const user = userEvent.setup();

        render(<PasskeyRegistration onSuccess={onSuccess} />);

        await user.click(screen.getByRole('button', { name: 'Add passkey' }));

        expect(screen.getByLabelText('Passkey name')).toBeInTheDocument();
    });

    it('registers under the name the anon typed', async () => {
        const user = userEvent.setup();

        render(<PasskeyRegistration onSuccess={onSuccess} />);

        await user.click(screen.getByRole('button', { name: 'Add passkey' }));

        const field = screen.getByLabelText('Passkey name');

        await user.clear(field);
        await user.type(field, 'Work laptop');
        await user.click(
            screen.getByRole('button', { name: 'Register passkey' }),
        );

        expect(register).toHaveBeenCalledWith('Work laptop');
    });

    it('will not register an unnamed passkey', async () => {
        const user = userEvent.setup();

        render(<PasskeyRegistration onSuccess={onSuccess} />);

        await user.click(screen.getByRole('button', { name: 'Add passkey' }));
        await user.clear(screen.getByLabelText('Passkey name'));

        expect(
            screen.getByRole('button', { name: 'Register passkey' }),
        ).toBeDisabled();
    });

    it('announces a registration failure against the field', async () => {
        registerState.error = 'That passkey is already registered.';
        const user = userEvent.setup();

        render(<PasskeyRegistration onSuccess={onSuccess} />);

        await user.click(screen.getByRole('button', { name: 'Add passkey' }));

        expect(screen.getByRole('alert')).toHaveTextContent(
            'That passkey is already registered.',
        );
        expect(screen.getByLabelText('Passkey name')).toHaveAttribute(
            'aria-invalid',
            'true',
        );
    });

    it('reports progress while the authenticator is working', async () => {
        registerState.isLoading = true;
        const user = userEvent.setup();

        render(<PasskeyRegistration onSuccess={onSuccess} />);

        await user.click(screen.getByRole('button', { name: 'Add passkey' }));

        expect(
            screen.getByRole('button', { name: /registering/i }),
        ).toBeDisabled();
    });

    it('closes the form when the anon backs out', async () => {
        const user = userEvent.setup();

        render(<PasskeyRegistration onSuccess={onSuccess} />);

        await user.click(screen.getByRole('button', { name: 'Add passkey' }));
        await user.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(screen.queryByLabelText('Passkey name')).toBeNull();
        expect(
            screen.getByRole('button', { name: 'Add passkey' }),
        ).toBeInTheDocument();
    });
});
