import { Form, Head } from '@inertiajs/react';
import { Mail } from 'lucide-react';
import { AuthInput } from '@/components/auth/auth-input';
import { AuthLink } from '@/components/auth/auth-link';
import { AuthStatus } from '@/components/auth/auth-status';
import { FormField } from '@/components/clover/form-field';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/routes';
import { email } from '@/routes/password';

export default function ForgotPassword({ status }: { status?: string }) {
    return (
        <>
            <Head title="Forgot password" />

            {status && <AuthStatus>{status}</AuthStatus>}

            <Form {...email.form()} className="flex flex-col gap-6">
                {({ processing, errors }) => (
                    <>
                        <FormField
                            id="email"
                            label="Email address"
                            error={errors.email}
                        >
                            <AuthInput
                                icon={Mail}
                                type="email"
                                name="email"
                                autoComplete="off"
                                autoFocus
                                placeholder="email@example.com"
                            />
                        </FormField>

                        <Button
                            type="submit"
                            size="lg"
                            className="w-full"
                            disabled={processing}
                            data-test="email-password-reset-link-button"
                        >
                            {processing && <Spinner />}
                            Email password reset link
                        </Button>

                        <p className="text-center text-body-sm text-muted-foreground">
                            Or return to{' '}
                            <AuthLink href={login()}>sign in</AuthLink>
                        </p>
                    </>
                )}
            </Form>
        </>
    );
}

ForgotPassword.layout = {
    title: 'Forgot password',
    description: 'Enter your email to receive a password reset link.',
};
