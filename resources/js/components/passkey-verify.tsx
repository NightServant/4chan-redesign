import type { UrlMethodPair } from '@inertiajs/core';
import { router } from '@inertiajs/react';
import { usePasskeyVerify } from '@laravel/passkeys/react';
import { CircleAlert, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';

type Props = {
    routes?: {
        options: UrlMethodPair;
        submit: UrlMethodPair;
    };
    label?: string;
    loadingLabel?: string;
    separator?: string;
};

/**
 * The passkey path on an auth screen, plus the rule dividing it from the email
 * path below. Every string is overridable because the same control appears on
 * sign-in and on password confirmation, where it means different things.
 */
export default function PasskeyVerify({
    routes,
    label,
    loadingLabel,
    separator,
}: Props = {}) {
    const { verify, isLoading, error, isSupported } = usePasskeyVerify({
        ...(routes && {
            routes: {
                options: routes.options.url,
                submit: routes.submit.url,
            },
        }),
        onSuccess: (response) => {
            router.visit(response.redirect ?? '/dashboard');
        },
    });

    if (!isSupported) {
        return null;
    }

    return (
        <>
            <div className="flex flex-col gap-2">
                <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={verify}
                    disabled={isLoading}
                >
                    {isLoading ? <Spinner /> : <KeyRound aria-hidden="true" />}
                    {isLoading
                        ? (loadingLabel ?? 'Authenticating')
                        : (label ?? 'Sign in with a passkey')}
                </Button>

                {error && (
                    <p
                        role="alert"
                        className="flex items-start justify-center gap-1.5 text-meta text-danger"
                    >
                        <CircleAlert
                            aria-hidden="true"
                            className="mt-px size-3.5 shrink-0"
                        />
                        {error}
                    </p>
                )}
            </div>

            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                </div>
                {/* The chip masks the rule behind it, so its fill has to match
                    whatever it sits on. This renders inside the auth card,
                    which is `bg-surface`; on `bg-bg` it read as a slightly
                    darker rectangle floating over the line. */}
                <div className="relative flex justify-center">
                    <span className="bg-surface px-2 text-label font-semibold tracking-[1.2px] text-faint uppercase">
                        {separator ?? 'Or continue with email'}
                    </span>
                </div>
            </div>
        </>
    );
}
