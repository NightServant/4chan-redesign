import { Form } from '@inertiajs/react';
import { AtSign } from 'lucide-react';
import { AuthInput, AuthPasswordInput } from '@/components/auth/auth-input';
import { AuthLink } from '@/components/auth/auth-link';
import { AuthStatus } from '@/components/auth/auth-status';
import { FormField } from '@/components/clover/form-field';
import { PageMeta } from '@/components/clover/page-meta';
import PasskeyVerify from '@/components/passkey-verify';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
};

export default function Login({ status, canResetPassword }: Props) {
    return (
        <>
            <PageMeta
                title="Sign in"
                description="Sign in to Clover to save threads, follow boards and reply. Reading needs no account."
            />

            {status && <AuthStatus>{status}</AuthStatus>}

            <PasskeyVerify />

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <FormField
                            id="email"
                            label="Email address"
                            error={errors.email}
                        >
                            <AuthInput
                                icon={AtSign}
                                type="email"
                                name="email"
                                required
                                autoFocus
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
                                autoComplete="current-password"
                                placeholder="Password"
                            />
                        </FormField>

                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <Checkbox id="remember" name="remember" />
                                <Label
                                    htmlFor="remember"
                                    className="text-body-sm text-muted-foreground"
                                >
                                    Remember me
                                </Label>
                            </div>

                            {canResetPassword && (
                                <AuthLink
                                    href={request()}
                                    className="text-body-sm"
                                >
                                    Forgot password?
                                </AuthLink>
                            )}
                        </div>

                        <Button
                            type="submit"
                            size="lg"
                            className="w-full"
                            disabled={processing}
                            data-test="login-button"
                        >
                            {processing && <Spinner />}
                            {processing ? 'Signing in…' : 'Sign in'}
                        </Button>

                        <p className="text-center text-body-sm text-muted-foreground">
                            Don't have an account?{' '}
                            <AuthLink href={register()}>
                                Create account
                            </AuthLink>
                        </p>
                    </>
                )}
            </Form>
        </>
    );
}

Login.layout = {
    title: 'Welcome back',
    description: 'Sign in to continue your Clover experience.',
};
