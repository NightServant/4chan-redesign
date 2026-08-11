import { Form } from '@inertiajs/react';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import TwoFactorRecoveryCodes from '@/components/two-factor-recovery-codes';
import TwoFactorSetupModal from '@/components/two-factor-setup-modal';
import { Button } from '@/components/ui/button';
import { useTwoFactorAuth } from '@/hooks/use-two-factor-auth';
import { cn } from '@/lib/utils';
import { disable, enable } from '@/routes/two-factor';

export type Props = {
    canManageTwoFactor?: boolean;
    requiresConfirmation?: boolean;
    twoFactorEnabled?: boolean;
};

/**
 * Two-factor is security state, so it is reported in green when on and in the
 * faint tone when off. Colour never carries that alone: the word and the icon
 * both change with it, which is what an anon who cannot separate the two hues
 * actually reads.
 */
export default function ManageTwoFactor(props: Props) {
    const requiresConfirmation = props.requiresConfirmation ?? false;
    const twoFactorEnabled = props.twoFactorEnabled ?? false;

    const {
        qrCodeSvg,
        hasSetupData,
        manualSetupKey,
        clearSetupData,
        clearTwoFactorAuthData,
        fetchSetupData,
        recoveryCodesList,
        fetchRecoveryCodes,
        errors,
    } = useTwoFactorAuth();
    const [showSetupModal, setShowSetupModal] = useState<boolean>(false);
    const prevTwoFactorEnabled = useRef(twoFactorEnabled);

    useEffect(() => {
        if (prevTwoFactorEnabled.current && !twoFactorEnabled) {
            clearTwoFactorAuthData();
        }

        prevTwoFactorEnabled.current = twoFactorEnabled;
    }, [twoFactorEnabled, clearTwoFactorAuthData]);

    if (!(props.canManageTwoFactor ?? false)) {
        return null;
    }

    const StatusIcon = twoFactorEnabled ? ShieldCheck : ShieldOff;

    return (
        <div className="flex flex-col gap-5">
            <p
                className={cn(
                    'flex items-center gap-2 text-body-sm font-medium',
                    twoFactorEnabled ? 'text-success' : 'text-faint',
                )}
            >
                <StatusIcon aria-hidden="true" className="size-4 shrink-0" />
                {twoFactorEnabled ? 'Enabled' : 'Not enabled'}
            </p>

            {twoFactorEnabled ? (
                <div className="flex flex-col gap-5">
                    <p className="text-body-sm text-muted-foreground">
                        Signing in asks for a six-digit code from the TOTP app
                        on your phone, on top of your password.
                    </p>

                    <Form {...disable.form()}>
                        {({ processing }) => (
                            <Button
                                variant="danger"
                                type="submit"
                                disabled={processing}
                            >
                                Disable two-factor
                            </Button>
                        )}
                    </Form>

                    <TwoFactorRecoveryCodes
                        recoveryCodesList={recoveryCodesList}
                        fetchRecoveryCodes={fetchRecoveryCodes}
                        errors={errors}
                    />
                </div>
            ) : (
                <div className="flex flex-col gap-5">
                    <p className="text-body-sm text-muted-foreground">
                        Add a second step to sign-in: a six-digit code from a
                        TOTP app on your phone, alongside your password.
                    </p>

                    {hasSetupData ? (
                        <Button onClick={() => setShowSetupModal(true)}>
                            <ShieldCheck aria-hidden="true" />
                            Continue setup
                        </Button>
                    ) : (
                        <Form
                            {...enable.form()}
                            onSuccess={() => setShowSetupModal(true)}
                        >
                            {({ processing }) => (
                                <Button type="submit" disabled={processing}>
                                    Enable two-factor
                                </Button>
                            )}
                        </Form>
                    )}
                </div>
            )}

            <TwoFactorSetupModal
                isOpen={showSetupModal}
                onClose={() => setShowSetupModal(false)}
                requiresConfirmation={requiresConfirmation}
                twoFactorEnabled={twoFactorEnabled}
                qrCodeSvg={qrCodeSvg}
                manualSetupKey={manualSetupKey}
                clearSetupData={clearSetupData}
                fetchSetupData={fetchSetupData}
                errors={errors}
            />
        </div>
    );
}
