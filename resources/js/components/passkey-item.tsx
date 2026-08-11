import { KeyRound, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { MachineValue } from '@/components/clover/machine-value';
import { Tag } from '@/components/clover/tag';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import type { Passkey } from '@/types/auth';

type Props = {
    passkey: Passkey;
    onDelete: (id: number, onError: () => void) => void;
};

/**
 * One registered passkey. Rendered as an `li` so the list it sits in is a real
 * list: an anon on a screen reader hears how many passkeys exist before
 * stepping through them.
 *
 * The remove control is named after the passkey rather than "Remove", because
 * a page with three of them otherwise offers three identically named buttons.
 */
export default function PasskeyItem({ passkey, onDelete }: Props) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = () => {
        setIsDeleting(true);
        onDelete(passkey.id, () => setIsDeleting(false));
    };

    return (
        <li className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
                <span
                    aria-hidden="true"
                    className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-surface-elevated text-faint"
                >
                    <KeyRound className="size-4" />
                </span>

                <div className="flex min-w-0 flex-col gap-0.5">
                    <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-body-sm font-medium text-foreground">
                            {passkey.name}
                        </p>
                        {passkey.authenticator && (
                            <Tag>{passkey.authenticator}</Tag>
                        )}
                    </div>

                    <MachineValue>
                        Added {passkey.created_at_diff}
                        {passkey.last_used_at_diff && (
                            <>
                                <span aria-hidden="true" className="px-1.5">
                                    /
                                </span>
                                Last used {passkey.last_used_at_diff}
                            </>
                        )}
                    </MachineValue>
                </div>
            </div>

            <Dialog>
                <DialogTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-danger hover:not-disabled:bg-danger-soft hover:not-disabled:text-danger"
                    >
                        <Trash2 aria-hidden="true" />
                        <span className="sr-only">Remove {passkey.name}</span>
                    </Button>
                </DialogTrigger>

                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Remove passkey</DialogTitle>
                        <DialogDescription>
                            {passkey.name} will no longer sign you in. You can
                            register it again later.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button
                            type="button"
                            variant="danger"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Removing' : 'Remove passkey'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </li>
    );
}
