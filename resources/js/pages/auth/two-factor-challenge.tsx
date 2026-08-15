import { Form, setLayoutProps } from '@inertiajs/react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { KeyRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AuthInput } from '@/components/auth/auth-input';
import { FormField } from '@/components/clover/form-field';
import { PageMeta } from '@/components/clover/page-meta';
import { Button } from '@/components/ui/button';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { Spinner } from '@/components/ui/spinner';
import { OTP_MAX_LENGTH } from '@/hooks/use-two-factor-auth';
import { store } from '@/routes/two-factor/login';

export default function TwoFactorChallenge() {
    const [showRecoveryInput, setShowRecoveryInput] = useState<boolean>(false);
    const [code, setCode] = useState<string>('');

    const authConfigContent = useMemo<{
        title: string;
        description: string;
        toggleText: string;
    }>(() => {
        if (showRecoveryInput) {
            return {
                title: 'Recovery code',
                description:
                    'Confirm access to your account with one of your emergency recovery codes.',
                toggleText: 'sign in using an authentication code',
            };
        }

        return {
            title: 'Authentication code',
            description:
                'Enter the code from the authenticator app this account is paired with.',
            toggleText: 'sign in using a recovery code',
        };
    }, [showRecoveryInput]);

    setLayoutProps({
        title: authConfigContent.title,
        description: authConfigContent.description,
    });

    const toggleRecoveryMode = (clearErrors: () => void): void => {
        setShowRecoveryInput(!showRecoveryInput);
        clearErrors();
        setCode('');
    };

    return (
        <>
            <PageMeta
                title="Two-factor authentication"
                description="Enter the code from your authenticator app, or a recovery code."
            />

            <Form
                {...store.form()}
                className="flex flex-col gap-6"
                resetOnError
                resetOnSuccess={!showRecoveryInput}
            >
                {({ errors, processing, clearErrors }) => (
                    <>
                        {/* The card's heading is already the field's name, so
                            the label is present for assistive technology and
                            hidden visually rather than printed twice. */}
                        {showRecoveryInput ? (
                            <FormField
                                id="recovery_code"
                                label="Recovery code"
                                labelClassName="sr-only"
                                error={errors.recovery_code}
                            >
                                <AuthInput
                                    icon={KeyRound}
                                    name="recovery_code"
                                    type="text"
                                    placeholder="Enter recovery code"
                                    autoFocus
                                    required
                                />
                            </FormField>
                        ) : (
                            <FormField
                                id="code"
                                label="Authentication code"
                                labelClassName="sr-only"
                                error={errors.code}
                            >
                                {(control) => (
                                    <div className="flex justify-center">
                                        <InputOTP
                                            {...control}
                                            name="code"
                                            maxLength={OTP_MAX_LENGTH}
                                            value={code}
                                            onChange={(value) => setCode(value)}
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
                                    </div>
                                )}
                            </FormField>
                        )}

                        <Button
                            type="submit"
                            size="lg"
                            className="w-full"
                            disabled={processing}
                        >
                            {processing && <Spinner />}
                            Continue
                        </Button>

                        <p className="text-center text-body-sm text-muted-foreground">
                            <span>Or you can </span>
                            <button
                                type="button"
                                className="font-medium text-primary underline decoration-primary-line underline-offset-4 transition-colors duration-[var(--duration-hover)] ease-standard hover:text-primary-hover hover:decoration-current focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                onClick={() => toggleRecoveryMode(clearErrors)}
                            >
                                {authConfigContent.toggleText}
                            </button>
                        </p>
                    </>
                )}
            </Form>
        </>
    );
}
