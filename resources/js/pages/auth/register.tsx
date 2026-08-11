import { Form, Head } from '@inertiajs/react';
import { Mail, User } from 'lucide-react';
import { AuthInput, AuthPasswordInput } from '@/components/auth/auth-input';
import { AuthLink } from '@/components/auth/auth-link';
import { FormField } from '@/components/clover/form-field';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/routes';
import { store } from '@/routes/register';

type Props = {
    passwordRules: string;
};

export default function Register({ passwordRules }: Props) {
    return (
        <>
            <Head title="Create account" />

            <Form
                {...store.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="flex flex-col gap-4">
                            <FormField
                                id="name"
                                label="Name"
                                error={errors.name}
                            >
                                <AuthInput
                                    icon={User}
                                    type="text"
                                    name="name"
                                    required
                                    autoFocus
                                    autoComplete="name"
                                    placeholder="Full name"
                                />
                            </FormField>

                            <FormField
                                id="email"
                                label="Email address"
                                error={errors.email}
                            >
                                <AuthInput
                                    icon={Mail}
                                    type="email"
                                    name="email"
                                    required
                                    autoComplete="email"
                                    placeholder="email@example.com"
                                />
                            </FormField>

                            <FormField
                                id="password"
                                label="Password"
                                error={errors.password}
                            >
                                <AuthPasswordInput
                                    name="password"
                                    required
                                    autoComplete="new-password"
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
                                    required
                                    autoComplete="new-password"
                                    placeholder="Confirm password"
                                    passwordrules={passwordRules}
                                />
                            </FormField>
                        </div>

                        <Button
                            type="submit"
                            size="lg"
                            className="w-full"
                            disabled={processing}
                            data-test="register-user-button"
                        >
                            {processing && <Spinner />}
                            {processing
                                ? 'Creating account…'
                                : 'Create account'}
                        </Button>

                        <p className="text-center text-body-sm text-muted-foreground">
                            Already have an account?{' '}
                            <AuthLink href={login()}>Sign in</AuthLink>
                        </p>
                    </>
                )}
            </Form>
        </>
    );
}

Register.layout = {
    title: 'Create your Clover account',
    description: 'Join the modern anonymous discussion platform.',
};
