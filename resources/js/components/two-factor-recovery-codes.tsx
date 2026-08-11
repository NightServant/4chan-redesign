import { Form } from '@inertiajs/react';
import { CircleAlert, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MachineValue } from '@/components/clover/machine-value';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { regenerateRecoveryCodes } from '@/routes/two-factor';

type Props = {
    recoveryCodesList: string[];
    fetchRecoveryCodes: () => Promise<void>;
    errors: string[];
};

/**
 * Recovery codes sit inside the two-factor panel, so this is a region rather
 * than a card of its own: Clover cards never nest.
 *
 * The codes are machine values in a recessed block. That is not decoration,
 * it is the point of the block: an anon copying one by hand needs the digit
 * columns to hold still and the group to be visibly separate from prose.
 */
export default function TwoFactorRecoveryCodes({
    recoveryCodesList,
    fetchRecoveryCodes,
    errors,
}: Props) {
    const [codesAreVisible, setCodesAreVisible] = useState<boolean>(false);
    const codesSectionRef = useRef<HTMLDivElement | null>(null);
    const canRegenerateCodes = recoveryCodesList.length > 0 && codesAreVisible;

    const toggleCodesVisibility = useCallback(async () => {
        if (!codesAreVisible && !recoveryCodesList.length) {
            await fetchRecoveryCodes();
        }

        setCodesAreVisible(!codesAreVisible);

        if (!codesAreVisible) {
            setTimeout(() => {
                codesSectionRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                });
            });
        }
    }, [codesAreVisible, recoveryCodesList.length, fetchRecoveryCodes]);

    useEffect(() => {
        if (!recoveryCodesList.length) {
            fetchRecoveryCodes();
        }
    }, [recoveryCodesList.length, fetchRecoveryCodes]);

    const RecoveryCodeIconComponent = codesAreVisible ? EyeOff : Eye;

    return (
        <div className="flex flex-col gap-3 select-none">
            <p className="text-body-sm text-muted-foreground">
                Recovery codes sign you in if you lose the device holding your
                authenticator. Keep them in a password manager.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button
                    variant="outline"
                    onClick={toggleCodesVisibility}
                    aria-expanded={codesAreVisible}
                    aria-controls="recovery-codes-section"
                >
                    <RecoveryCodeIconComponent aria-hidden="true" />
                    {codesAreVisible ? 'Hide' : 'View'} recovery codes
                </Button>

                {canRegenerateCodes && (
                    <Form
                        {...regenerateRecoveryCodes.form()}
                        options={{ preserveScroll: true }}
                        onSuccess={fetchRecoveryCodes}
                    >
                        {({ processing }) => (
                            <Button
                                variant="ghost"
                                type="submit"
                                disabled={processing}
                                aria-describedby="regenerate-warning"
                            >
                                <RefreshCw aria-hidden="true" />
                                Regenerate codes
                            </Button>
                        )}
                    </Form>
                )}
            </div>

            {/* `hidden` rather than a collapsed height: the block's height
                depends on how many codes came back, and animating a layout
                property is banned outright. Reveal is instant. */}
            <div id="recovery-codes-section" hidden={!codesAreVisible}>
                {errors?.length ? (
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
                ) : (
                    <div className="flex flex-col gap-3">
                        <div
                            ref={codesSectionRef}
                            className="grid gap-1 rounded-lg border border-border bg-bg p-4"
                            role="list"
                            aria-label="Recovery codes"
                        >
                            {recoveryCodesList.length ? (
                                recoveryCodesList.map((code) => (
                                    <div
                                        key={code}
                                        role="listitem"
                                        className="select-text"
                                    >
                                        <MachineValue className="text-body-sm text-foreground">
                                            {code}
                                        </MachineValue>
                                    </div>
                                ))
                            ) : (
                                <div
                                    className="flex flex-col gap-2"
                                    aria-label="Loading recovery codes"
                                >
                                    {Array.from({ length: 8 }, (_, index) => (
                                        <Skeleton
                                            key={index}
                                            className="h-4 w-40"
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        <p
                            id="regenerate-warning"
                            className="text-meta text-muted-foreground"
                        >
                            Each code works once and is removed after use.
                            Regenerating replaces every code that is left.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
