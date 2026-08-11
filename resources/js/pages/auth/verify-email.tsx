import { Form, Head } from '@inertiajs/react';
import { AuthLink } from '@/components/auth/auth-link';
import { AuthStatus } from '@/components/auth/auth-status';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { logout } from '@/routes';
import { send } from '@/routes/verification';

export default function VerifyEmail({ status }: { status?: string }) {
    return (
        <>
            <Head title="Email verification" />

            {status === 'verification-link-sent' && (
                <AuthStatus>
                    A new verification link has been sent to the address you
                    registered with.
                </AuthStatus>
            )}

            <Form {...send.form()} className="flex flex-col gap-6">
                {({ processing }) => (
                    <>
                        <Button
                            type="submit"
                            size="lg"
                            variant="outline"
                            className="w-full"
                            disabled={processing}
                        >
                            {processing && <Spinner />}
                            Resend verification email
                        </Button>

                        <p className="text-center text-body-sm text-muted-foreground">
                            Wrong account?{' '}
                            <AuthLink href={logout()}>Sign out</AuthLink>
                        </p>
                    </>
                )}
            </Form>
        </>
    );
}

VerifyEmail.layout = {
    title: 'Verify your email',
    description:
        'Open the link just emailed to you to finish setting up this account.',
};
