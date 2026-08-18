import { Form } from '@inertiajs/react';
import { Mail } from 'lucide-react';
import { AuthInput, AuthPasswordInput } from '@/components/auth/auth-input';
import { FormField } from '@/components/clover/form-field';
import { PageMeta } from '@/components/clover/page-meta';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { update } from '@/routes/password';

type Props = {
    token: string;
    email: string;
    passwordRules: string;
};

export default function ResetPassword({ token, email, passwordRules }: Props) {
    return (
        <>
            <PageMeta
                title="Reset password"
                description="Choose a new password for your Clover account."
            />

            <Form
                {...update.form()}
                transform={(data) => ({ ...data, token, email })}
                resetOnSuccess={['password', 'password_confirmation']}
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        {/* Fixed by the signed link. Shown so it is clear
                            which account is being reset, read-only so it
                            cannot drift out of step with the token. */}
                        <FormField
                            id="email"
                            label="Email address"
                            error={errors.email}
                        >
                            <AuthInput
                                icon={Mail}
                                type="email"
                                name="email"
                                autoComplete="email"
                                value={email}
                                readOnly
                            />
                        </FormField>

                        <FormField
                            id="password"
                            label="Password"
                            error={errors.password}
                        >
                            <AuthPasswordInput
                                name="password"
                                autoComplete="new-password"
                                autoFocus
                                placeholder="Password"
                                passwordrules={passwordRules}
                            />
                        </FormField>

                        <FormField
                            id="password_confirmation"
                            label="Confirm password"
                            error={errors.password_confirmation}
                        >
                            <AuthPasswordInput
                                name="password_confirmation"
                                autoComplete="new-password"
                                placeholder="Confirm password"
                                shortPlaceholder="Confirm"
                                passwordrules={passwordRules}
                            />
                        </FormField>

                        <Button
                            type="submit"
                            size="lg"
                            className="w-full"
                            disabled={processing}
                            data-test="reset-password-button"
                        >
                            {processing && <Spinner />}
                            Reset password
                        </Button>
                    </>
                )}
            </Form>
        </>
    );
}

ResetPassword.layout = {
    title: 'Reset password',
    description: 'Choose a new password for this account.',
};
