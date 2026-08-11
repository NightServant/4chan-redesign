import { Form } from '@inertiajs/react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { Check, CircleAlert, Copy, ScanLine } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FormField } from '@/components/clover/form-field';
import { MachineValue } from '@/components/clover/machine-value';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { Spinner } from '@/components/ui/spinner';
import { useAppearance } from '@/hooks/use-appearance';
import { useClipboard } from '@/hooks/use-clipboard';
import { OTP_MAX_LENGTH } from '@/hooks/use-two-factor-auth';
import { confirm } from '@/routes/two-factor';

/**
 * Matches the icon chip `EmptyState` uses, so the two net-new security
 * surfaces are recognisably the same system. Decorative, so it is hidden.
 */
function SetupIcon() {
    return (
        <span
            aria-hidden="true"
            className="mb-1 grid size-14 place-items-center rounded-2xl border border-border bg-surface text-faint"
        >
            <ScanLine className="size-5.5" />
        </span>
    );
}

function SetupErrors({ errors }: { errors: string[] }) {
    return (
        <p
            role="alert"
            className="flex items-start gap-1.5 text-body-sm text-danger"
        >
            <CircleAlert
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0"
            />
            {Array.from(new Set(errors)).join(' ')}
        </p>
    );
}

function TwoFactorSetupStep({
    qrCodeSvg,
    manualSetupKey,
    buttonText,
    onNextStep,
    errors,
}: {
    qrCodeSvg: string | null;
    manualSetupKey: string | null;
    buttonText: string;
    onNextStep: () => void;
    errors: string[];
}) {
    const { resolvedAppearance } = useAppearance();
    const [copiedText, copy] = useClipboard();
    const IconComponent = copiedText === manualSetupKey ? Check : Copy;

    if (errors?.length) {
        return <SetupErrors errors={errors} />;
    }

    return (
        <>
            {/* The QR code is a real SVG rendered by the server, not an image
                of invented content. On dark it is inverted rather than
                re-rendered, because the scannable contrast is the payload. */}
            <div className="grid aspect-square w-56 place-items-center rounded-lg border border-border p-4">
                {qrCodeSvg ? (
                    <div
                        className="aspect-square w-full rounded-md bg-white p-2 [&_svg]:size-full"
                        dangerouslySetInnerHTML={{ __html: qrCodeSvg }}
                        style={{
                            filter:
                                resolvedAppearance === 'dark'
                                    ? 'invert(1) brightness(1.5)'
                                    : undefined,
                        }}
                    />
                ) : (
                    <Spinner />
                )}
            </div>

            <Button className="w-full" onClick={onNextStep}>
                {buttonText}
            </Button>

            <div className="relative flex w-full items-center justify-center">
                <div className="absolute inset-0 top-1/2 h-px w-full bg-border" />
                <span className="relative bg-surface-elevated px-2 text-label font-semibold tracking-[1.2px] text-faint uppercase">
                    Or enter the key by hand
                </span>
            </div>

            <div className="flex w-full items-stretch overflow-hidden rounded-lg border border-border bg-bg">
                {!manualSetupKey ? (
                    <div className="grid w-full place-items-center p-3">
                        <Spinner />
                    </div>
                ) : (
                    <>
                        <MachineValue className="min-w-0 flex-1 self-center truncate px-3 text-body-sm text-foreground select-text">
                            {manualSetupKey}
                        </MachineValue>
                        <button
                            type="button"
                            onClick={() => copy(manualSetupKey)}
                            className="border-l border-border px-3 text-muted-foreground transition-colors duration-[var(--duration-hover)] ease-standard hover:bg-surface-hover hover:text-foreground"
                        >
                            <IconComponent
                                aria-hidden="true"
                                className="size-4"
                            />
                            <span className="sr-only">Copy setup key</span>
                        </button>
                    </>
                )}
            </div>
        </>
    );
}

function TwoFactorVerificationStep({
    onClose,
    onBack,
}: {
    onClose: () => void;
    onBack: () => void;
}) {
    const [code, setCode] = useState<string>('');
    const pinInputContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setTimeout(() => {
            pinInputContainerRef.current?.querySelector('input')?.focus();
        }, 0);
    }, []);

    return (
        <Form
            {...confirm.form()}
            onSuccess={() => onClose()}
            resetOnError
            resetOnSuccess
            className="w-full"
        >
            {({
                processing,
                errors,
            }: {
                processing: boolean;
                errors?: { confirmTwoFactorAuthentication?: { code?: string } };
            }) => (
                <div
                    ref={pinInputContainerRef}
                    className="flex w-full flex-col gap-5"
                >
                    <FormField
                        label="Authentication code"
                        className="items-center"
                        error={errors?.confirmTwoFactorAuthentication?.code}
                    >
                        <InputOTP
                            id="otp"
                            name="code"
                            maxLength={OTP_MAX_LENGTH}
                            onChange={setCode}
                            disabled={processing}
                            pattern={REGEXP_ONLY_DIGITS}
                            autoFocus
                        >
                            <InputOTPGroup>
                                {Array.from(
                                    { length: OTP_MAX_LENGTH },
                                    (_, index) => (
                                        <InputOTPSlot
                                            key={index}
                                            index={index}
                                        />
                                    ),
                                )}
                            </InputOTPGroup>
                        </InputOTP>
                    </FormField>

                    <div className="flex w-full gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={onBack}
                            disabled={processing}
                        >
                            Back
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1"
                            disabled={
                                processing || code.length < OTP_MAX_LENGTH
                            }
                        >
                            Confirm
                        </Button>
                    </div>
                </div>
            )}
        </Form>
    );
}

type Props = {
    isOpen: boolean;
    onClose: () => void;
    requiresConfirmation: boolean;
    twoFactorEnabled: boolean;
    qrCodeSvg: string | null;
    manualSetupKey: string | null;
    clearSetupData: () => void;
    fetchSetupData: () => Promise<void>;
    errors: string[];
};

export default function TwoFactorSetupModal({
    isOpen,
    onClose,
    requiresConfirmation,
    twoFactorEnabled,
    qrCodeSvg,
    manualSetupKey,
    clearSetupData,
    fetchSetupData,
    errors,
}: Props) {
    const [showVerificationStep, setShowVerificationStep] =
        useState<boolean>(false);

    const modalConfig = useMemo<{
        title: string;
        description: string;
        buttonText: string;
    }>(() => {
        if (twoFactorEnabled) {
            return {
                title: 'Two-factor authentication enabled',
                description:
                    'Scan the code or enter the key in your authenticator app to finish pairing this account.',
                buttonText: 'Done',
            };
        }

        if (showVerificationStep) {
            return {
                title: 'Verify authentication code',
                description:
                    'Enter the six-digit code your authenticator app is showing.',
                buttonText: 'Continue',
            };
        }

        return {
            title: 'Enable two-factor authentication',
            description:
                'Scan the code with your authenticator app, or enter the setup key by hand.',
            buttonText: 'Continue',
        };
    }, [twoFactorEnabled, showVerificationStep]);

    const resetModalState = useCallback(() => {
        setShowVerificationStep(false);
        clearSetupData();
    }, [clearSetupData]);

    const handleClose = useCallback(() => {
        resetModalState();
        onClose();
    }, [onClose, resetModalState]);

    const handleModalNextStep = useCallback(() => {
        if (requiresConfirmation) {
            setShowVerificationStep(true);

            return;
        }

        handleClose();
    }, [requiresConfirmation, handleClose]);

    const fetchSetupDataRef = useRef(fetchSetupData);

    useEffect(() => {
        fetchSetupDataRef.current = fetchSetupData;
    }, [fetchSetupData]);

    useEffect(() => {
        if (isOpen && !qrCodeSvg) {
            fetchSetupDataRef.current();
        }
    }, [isOpen, qrCodeSvg]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="flex flex-col items-center text-center sm:text-center">
                    <SetupIcon />
                    <DialogTitle>{modalConfig.title}</DialogTitle>
                    <DialogDescription className="text-balance">
                        {modalConfig.description}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center gap-5">
                    {showVerificationStep ? (
                        <TwoFactorVerificationStep
                            onClose={handleClose}
                            onBack={() => setShowVerificationStep(false)}
                        />
                    ) : (
                        <TwoFactorSetupStep
                            qrCodeSvg={qrCodeSvg}
                            manualSetupKey={manualSetupKey}
                            buttonText={modalConfig.buttonText}
                            onNextStep={handleModalNextStep}
                            errors={errors}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
