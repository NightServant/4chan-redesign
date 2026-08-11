import { router } from '@inertiajs/react';
import { KeyRound } from 'lucide-react';
import { destroy } from '@/actions/Laravel/Passkeys/Http/Controllers/PasskeyRegistrationController';
import { EmptyState } from '@/components/clover/empty-state';
import PasskeyItem from '@/components/passkey-item';
import PasskeyRegistration from '@/components/passkey-register';
import type { Passkey } from '@/types/auth';

export type Props = {
    canManagePasskeys?: boolean;
    passkeys?: Passkey[];
};

export default function ManagePasskeys(props: Props) {
    const passkeys = props.passkeys ?? [];

    const handleDelete = (id: number, onError: () => void) => {
        router.delete(destroy.url(id), {
            preserveScroll: true,
            onError,
        });
    };

    const handleRegisterSuccess = () => {
        router.reload();
    };

    if (!(props.canManagePasskeys ?? false)) {
        return null;
    }

    return (
        <div className="flex flex-col gap-5">
            {passkeys.length > 0 ? (
                <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                    {passkeys.map((passkey) => (
                        <PasskeyItem
                            key={passkey.id}
                            passkey={passkey}
                            onDelete={handleDelete}
                        />
                    ))}
                </ul>
            ) : (
                /* Deliberately unframed. An empty bordered box reads as a
                   component that failed to load; plain centred text reads as
                   an account that has not registered one yet. */
                <EmptyState
                    icon={<KeyRound />}
                    title="No passkeys"
                    body="A passkey signs you in with the device you are already holding, instead of a password. None are registered on this account."
                    className="py-10"
                />
            )}

            <PasskeyRegistration onSuccess={handleRegisterSuccess} />
        </div>
    );
}
