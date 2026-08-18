import { Form } from '@inertiajs/react';
import { Mail } from 'lucide-react';
import { AuthInput, AuthPasswordInput } from '@/components/auth/auth-input';
import { AuthLink } from '@/components/auth/auth-link';
import { FormField } from '@/components/clover/form-field';
import { PageMeta } from '@/components/clover/page-meta';
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
            <PageMeta
                title="Create account"
                description="An account on Clover saves threads and follows boards. Nothing you post carries it."
            />

            <Form
                {...store.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        {/* No name field. Registration asked for a full
                            name on a site whose premise is anonymity, and
                            people gave their real one -- it was then the
                            heading on their public profile, because the
                            handle fell back to it. The account needs an
                            address to reach you at and a password; it does
                            not need to know who you are. */}
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
                                shortPlaceholder="you@site.com"
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
                                shortPlaceholder="Confirm"
                                passwordrules={passwordRules}
                            />
                        </FormField>

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
