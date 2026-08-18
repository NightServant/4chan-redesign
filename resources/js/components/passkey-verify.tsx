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

            {/* A real row: rule, label, rule.

                It was an `absolute inset-0` rule with the label floated over
                it on a `bg-surface` chip that masked the line behind it. That
                works only while the label sets on one line. "Or continue with
                email" does; "Or confirm with password" on the confirm-password
                screen wraps to two at ~320px, and because the label is in flow
                and the rule is not, the row grew while the rule stayed
                vertically centred — the line ran straight through the middle
                of the text.

                As siblings the row's height is the label's height at any
                width, and the rules sit either side of it however many lines it
                takes. The masking fill goes with the overlay: there is nothing
                behind the label to mask, so it no longer has to guess what
                colour it is sitting on. */}
            <div className="my-6 flex items-center gap-3">
                <Separator className="flex-1" />

                <span className="text-center text-label font-semibold tracking-[1.2px] text-faint uppercase">
                    {separator ?? 'Or continue with email'}
                </span>

                <Separator className="flex-1" />
            </div>
        </>
    );
}
