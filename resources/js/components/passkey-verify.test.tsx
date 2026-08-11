import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PasskeyVerify from '@/components/passkey-verify';

const { verifyState, verify, router } = vi.hoisted(() => ({
    verify: vi.fn(),
    router: { visit: vi.fn() },
    verifyState: {
        isLoading: false,
        error: undefined as string | undefined,
        isSupported: true,
    },
}));

vi.mock('@inertiajs/react', () => ({ router }));

vi.mock('@laravel/passkeys/react', () => ({
    usePasskeyVerify: () => ({ ...verifyState, verify }),
}));

beforeEach(() => {
    verify.mockReset();
    router.visit.mockClear();
    verifyState.isLoading = false;
    verifyState.error = undefined;
    verifyState.isSupported = true;
});

describe('PasskeyVerify', () => {
    it('renders nothing when the browser cannot do passkeys', () => {
        verifyState.isSupported = false;

        const { container } = render(<PasskeyVerify />);

        expect(container).toBeEmptyDOMElement();
    });

    it('offers the default sign-in action and separator copy', () => {
        render(<PasskeyVerify />);

        expect(
            screen.getByRole('button', { name: 'Sign in with a passkey' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Or continue with email')).toBeInTheDocument();
    });

    it('takes overridden copy from the page that hosts it', () => {
        render(
            <PasskeyVerify
                label="Confirm with a passkey"
                separator="Or use your password"
            />,
        );

        expect(
            screen.getByRole('button', { name: 'Confirm with a passkey' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Or use your password')).toBeInTheDocument();
    });

    it('starts verification when pressed', async () => {
        const user = userEvent.setup();

        render(<PasskeyVerify />);

        await user.click(
            screen.getByRole('button', { name: 'Sign in with a passkey' }),
        );

        expect(verify).toHaveBeenCalled();
    });

    it('reports progress and blocks a second press while working', () => {
        verifyState.isLoading = true;

        render(<PasskeyVerify loadingLabel="Waiting for your device" />);

        expect(
            screen.getByRole('button', { name: /waiting for your device/i }),
        ).toBeDisabled();
    });

    it('announces a verification failure', () => {
        verifyState.error = 'That passkey was not recognised.';

        render(<PasskeyVerify />);

        expect(screen.getByRole('alert')).toHaveTextContent(
            'That passkey was not recognised.',
        );
    });
});
