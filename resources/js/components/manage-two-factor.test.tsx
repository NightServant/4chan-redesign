import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ManageTwoFactor from '@/components/manage-two-factor';

/**
 * The setup modal and the recovery codes own their own suites. Stubbing them
 * here keeps this file about what `ManageTwoFactor` decides: whether the
 * surface renders at all, which state it reports, and which action it offers.
 */
const { formState, twoFactorAuth } = vi.hoisted(() => ({
    formState: { processing: false },
    twoFactorAuth: {
        qrCodeSvg: null as string | null,
        hasSetupData: false,
        manualSetupKey: null as string | null,
        clearSetupData: vi.fn(),
        clearTwoFactorAuthData: vi.fn(),
        fetchSetupData: vi.fn(),
        recoveryCodesList: [] as string[],
        fetchRecoveryCodes: vi.fn(),
        errors: [] as string[],
    },
}));

vi.mock('@inertiajs/react', () => ({
    Form: ({
        children,
        action,
        onSuccess,
    }: {
        children: (state: typeof formState) => ReactNode;
        action?: string;
        onSuccess?: () => void;
    } & Record<string, unknown>) => (
        <form
            action={action}
            onSubmit={(event) => {
                event.preventDefault();
                onSuccess?.();
            }}
        >
            {children(formState)}
        </form>
    ),
}));

vi.mock('@/hooks/use-two-factor-auth', () => ({
    useTwoFactorAuth: () => twoFactorAuth,
    OTP_MAX_LENGTH: 6,
}));

vi.mock('@/components/two-factor-setup-modal', () => ({
    default: ({ isOpen }: { isOpen: boolean }) =>
        isOpen ? <div data-testid="setup-modal" /> : null,
}));

vi.mock('@/components/two-factor-recovery-codes', () => ({
    default: () => <div data-testid="recovery-codes" />,
}));

beforeEach(() => {
    formState.processing = false;
    twoFactorAuth.hasSetupData = false;
});

describe('ManageTwoFactor', () => {
    it('renders nothing when the feature is unavailable', () => {
        const { container } = render(
            <ManageTwoFactor canManageTwoFactor={false} />,
        );

        expect(container).toBeEmptyDOMElement();
    });

    it('reports the off state in words, not colour alone', () => {
        render(<ManageTwoFactor canManageTwoFactor twoFactorEnabled={false} />);

        const status = screen.getByText('Not enabled');

        expect(status).toBeInTheDocument();
        expect(status.className).toContain('text-faint');
    });

    it('reports the on state in words, not colour alone', () => {
        render(<ManageTwoFactor canManageTwoFactor twoFactorEnabled />);

        const status = screen.getByText('Enabled');

        expect(status).toBeInTheDocument();
        expect(status.className).toContain('text-success');
    });

    it('offers to enable two-factor while it is off', () => {
        render(<ManageTwoFactor canManageTwoFactor twoFactorEnabled={false} />);

        expect(
            screen.getByRole('button', { name: 'Enable two-factor' }),
        ).toBeInTheDocument();
        expect(screen.queryByTestId('recovery-codes')).toBeNull();
    });

    it('resumes an interrupted setup instead of enabling again', async () => {
        twoFactorAuth.hasSetupData = true;
        const user = userEvent.setup();

        render(<ManageTwoFactor canManageTwoFactor twoFactorEnabled={false} />);

        const resume = screen.getByRole('button', { name: 'Continue setup' });

        await user.click(resume);

        expect(screen.getByTestId('setup-modal')).toBeInTheDocument();
    });

    it('offers to disable two-factor and shows recovery codes while it is on', () => {
        render(<ManageTwoFactor canManageTwoFactor twoFactorEnabled />);

        expect(
            screen.getByRole('button', { name: 'Disable two-factor' }),
        ).toBeInTheDocument();
        expect(screen.getByTestId('recovery-codes')).toBeInTheDocument();
    });

    it('marks the disable action destructive', () => {
        render(<ManageTwoFactor canManageTwoFactor twoFactorEnabled />);

        expect(
            screen.getByRole('button', { name: 'Disable two-factor' })
                .className,
        ).toContain('bg-danger');
    });

    it('opens the setup modal once enabling succeeds', async () => {
        const user = userEvent.setup();

        render(<ManageTwoFactor canManageTwoFactor twoFactorEnabled={false} />);

        expect(screen.queryByTestId('setup-modal')).toBeNull();

        await user.click(
            screen.getByRole('button', { name: 'Enable two-factor' }),
        );

        expect(screen.getByTestId('setup-modal')).toBeInTheDocument();
    });
});
