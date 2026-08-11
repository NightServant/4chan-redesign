import { Form } from '@inertiajs/react';
import { useRef } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import { FormField } from '@/components/clover/form-field';
import PasswordInput from '@/components/password-input';
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

/**
 * Account deletion, behind a password confirmation.
 *
 * The copy states what deletion does not touch as well as what it does: posts
 * on Clover are anonymous and carry no account reference, so they survive. An
 * anon who deletes expecting their posts to go with them has been misled, and
 * this is the only place to say otherwise.
 */
export default function DeleteUser() {
    const passwordInput = useRef<HTMLInputElement>(null);

    return (
        <div className="flex flex-col gap-4">
            <p className="text-body-sm text-muted-foreground">
                Deleting your account is permanent. Your posts are anonymous and
                carry no reference to it, so they stay on the boards.
            </p>

            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="danger" data-test="delete-user-button">
                        Delete account
                    </Button>
                </DialogTrigger>

                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete your account?</DialogTitle>
                        <DialogDescription>
                            This removes the account, its email address and its
                            saved settings. It cannot be undone.
                        </DialogDescription>
                    </DialogHeader>

                    <Form
                        {...ProfileController.destroy.form()}
                        options={{
                            preserveScroll: true,
                        }}
                        onError={() => passwordInput.current?.focus()}
                        resetOnSuccess
                        className="flex flex-col gap-5"
                    >
                        {({ resetAndClearErrors, processing, errors }) => (
                            <>
                                <FormField
                                    label="Password"
                                    description="Confirm it is you before the account is removed."
                                    error={errors.password}
                                >
                                    <PasswordInput
                                        id="password"
                                        name="password"
                                        ref={passwordInput}
                                        placeholder="Password"
                                        autoComplete="current-password"
                                    />
                                </FormField>

                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                resetAndClearErrors()
                                            }
                                        >
                                            Cancel
                                        </Button>
                                    </DialogClose>

                                    <Button
                                        type="submit"
                                        variant="danger"
                                        disabled={processing}
                                        data-test="confirm-delete-user-button"
                                    >
                                        Delete permanently
                                    </Button>
                                </DialogFooter>
                            </>
                        )}
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
