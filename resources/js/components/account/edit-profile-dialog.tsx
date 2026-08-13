import { Form } from '@inertiajs/react';
import { Settings } from 'lucide-react';
import { useState } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import { FormField } from '@/components/clover/form-field';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Profile } from '@/types/clover';

/**
 * "Edit profile", as a dialog over the profile it edits.
 *
 * It was a link to the settings page, and that was wrong twice over. The
 * settings form edited the account's `name` and email — neither of which the
 * profile shows — so the button promised to change what a reader was looking at
 * and changed nothing they could see. And it navigated away from the thing
 * being edited, which is the one place a form benefits from staying.
 *
 * The two fields here are exactly the two the profile displays: the heading and
 * the line under it. Nothing else belongs in a dialog opened from a profile.
 *
 * ## Why the handle may be left blank
 *
 * An account with no handle falls back to `anon_{id}`, which is the right
 * default on a board that promises anonymity. So the field seeds from what is
 * *stored* rather than from what the heading shows: seeding it with the
 * fallback would mean an anon who opened this to fix a typo in their bio saved
 * `anon_41` as a real, unique, taken handle on the way out.
 */
const BIO_LIMIT = 280;

type EditProfileDialogProps = {
    profile: Profile;
};

function EditProfileDialog({ profile }: EditProfileDialogProps) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Settings aria-hidden="true" />
                    Edit profile
                </Button>
            </DialogTrigger>

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit profile</DialogTitle>
                    <DialogDescription>
                        The name at the top of this page and the line under it.
                        Your account name, email and password live in settings.
                    </DialogDescription>
                </DialogHeader>

                <Form
                    {...ProfileController.updateIdentity.form()}
                    options={{ preserveScroll: true }}
                    /* Closed by the server saying it worked, not by the press.
                       Closing on submit would hide the errors that come back. */
                    onSuccess={() => setOpen(false)}
                    className="flex flex-col gap-5"
                >
                    {({ processing, errors }) => (
                        <>
                            <FormField
                                label="Username"
                                description="Letters, numbers and underscores. Leave it blank to stay anon."
                                error={errors.handle}
                            >
                                <Input
                                    id="handle"
                                    name="handle"
                                    defaultValue={profile.storedHandle ?? ''}
                                    autoComplete="off"
                                    placeholder="anon"
                                />
                            </FormField>

                            <FormField
                                label="Bio"
                                description={`Up to ${BIO_LIMIT} characters.`}
                                error={errors.bio}
                            >
                                <Textarea
                                    id="bio"
                                    name="bio"
                                    defaultValue={profile.bio}
                                    rows={3}
                                    maxLength={BIO_LIMIT}
                                    placeholder="Reads /g/ at 3am."
                                />
                            </FormField>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    disabled={processing}
                                    data-test="save-profile-button"
                                >
                                    Save
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export { EditProfileDialog };
export type { EditProfileDialogProps };
