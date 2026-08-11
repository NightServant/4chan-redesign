import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TwoFactorSetupModal from '@/components/two-factor-setup-modal';

/**
 * jsdom does not implement `elementFromPoint`, and `input-otp` calls it from a
 * timer after mount. Without it the call throws outside any test's stack and
 * surfaces as an unhandled error that no assertion accounts for. This belongs
 * next to the `ResizeObserver` and `scrollIntoView` shims in
 * `resources/js/test/setup.ts`; it sits here because that file is owned by
 * nobody on this task.
 */
if (!document.elementFromPoint) {
    document.elementFromPoint = () => null;
}

const { formState } = vi.hoisted(() => ({
    formState: {
        processing: false,
        errors: {} as Record<string, { code?: string }>,
    },
}));

vi.mock('@inertiajs/react', () => ({
    Form: ({
        children,
        action,
    }: {
        children: (state: typeof formState) => ReactNode;
        action?: string;
    } & Record<string, unknown>) => (
        <form action={action}>{children(formState)}</form>
    ),
}));

const QR_CODE_SVG = '<svg role="img" aria-label="Setup QR code"></svg>';

const baseProps = {
    isOpen: true,
    onClose: vi.fn(),
    requiresConfirmation: false,
    twoFactorEnabled: false,
    qrCodeSvg: QR_CODE_SVG,
    manualSetupKey: 'JBSWY3DPEHPK3PXP',
    clearSetupData: vi.fn(),
    fetchSetupData: vi.fn(),
    errors: [] as string[],
};

beforeEach(() => {
    formState.processing = false;
    formState.errors = {};
    baseProps.onClose.mockClear();
    baseProps.clearSetupData.mockClear();
    baseProps.fetchSetupData.mockClear();
});

describe('TwoFactorSetupModal', () => {
    it('renders nothing while closed', () => {
        render(<TwoFactorSetupModal {...baseProps} isOpen={false} />);

        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('names the enable step', () => {
        render(<TwoFactorSetupModal {...baseProps} />);

        expect(
            screen.getByRole('heading', {
                name: 'Enable two-factor authentication',
            }),
        ).toBeInTheDocument();
    });

    it('renders the server-rendered QR code untouched', () => {
        render(<TwoFactorSetupModal {...baseProps} />);

        expect(
            screen.getByRole('dialog').querySelector('svg[aria-label]'),
        ).not.toBeNull();
    });

    it('sets the manual key as a machine value and offers to copy it', () => {
        render(<TwoFactorSetupModal {...baseProps} />);

        const key = screen.getByText('JBSWY3DPEHPK3PXP');

        expect(key).toHaveAttribute('data-slot', 'machine-value');
        expect(
            screen.getByRole('button', { name: 'Copy setup key' }),
        ).toBeInTheDocument();
    });

    it('fetches setup data when it opens without a QR code', () => {
        render(<TwoFactorSetupModal {...baseProps} qrCodeSvg={null} />);

        expect(baseProps.fetchSetupData).toHaveBeenCalled();
    });

    it('closes without a verification step when confirmation is off', async () => {
        const user = userEvent.setup();

        render(<TwoFactorSetupModal {...baseProps} />);

        await user.click(screen.getByRole('button', { name: 'Continue' }));

        expect(baseProps.onClose).toHaveBeenCalled();
        expect(baseProps.clearSetupData).toHaveBeenCalled();
    });

    it('asks for a code when confirmation is required', async () => {
        const user = userEvent.setup();

        render(<TwoFactorSetupModal {...baseProps} requiresConfirmation />);

        await user.click(screen.getByRole('button', { name: 'Continue' }));

        expect(
            screen.getByRole('heading', { name: 'Verify authentication code' }),
        ).toBeInTheDocument();
        expect(screen.getByLabelText('Authentication code')).toHaveAttribute(
            'name',
            'code',
        );
    });

    it('returns to the setup step from the verification step', async () => {
        const user = userEvent.setup();

        render(<TwoFactorSetupModal {...baseProps} requiresConfirmation />);

        await user.click(screen.getByRole('button', { name: 'Continue' }));
        await user.click(screen.getByRole('button', { name: 'Back' }));

        expect(
            screen.getByRole('heading', {
                name: 'Enable two-factor authentication',
            }),
        ).toBeInTheDocument();
    });

    it('announces a rejected code', async () => {
        formState.errors = {
            confirmTwoFactorAuthentication: { code: 'The code is invalid.' },
        };
        const user = userEvent.setup();

        render(<TwoFactorSetupModal {...baseProps} requiresConfirmation />);

        await user.click(screen.getByRole('button', { name: 'Continue' }));

        expect(screen.getByRole('alert')).toHaveTextContent(
            'The code is invalid.',
        );
    });

    it('announces a setup failure instead of the QR code', () => {
        render(
            <TwoFactorSetupModal
                {...baseProps}
                qrCodeSvg={null}
                errors={['Two-factor setup could not be started.']}
            />,
        );

        expect(screen.getByRole('alert')).toHaveTextContent(
            'Two-factor setup could not be started.',
        );
    });

    it('names the already-enabled step', () => {
        render(<TwoFactorSetupModal {...baseProps} twoFactorEnabled />);

        expect(
            screen.getByRole('heading', {
                name: 'Two-factor authentication enabled',
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Done' }),
        ).toBeInTheDocument();
    });
});
