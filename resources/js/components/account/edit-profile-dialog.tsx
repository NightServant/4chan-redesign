import { Form } from '@inertiajs/react';
import { PencilIcon } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
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
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Profile } from '@/types/clover';

/**
 * "Edit profile", as a surface over the profile it edits.
 *
 * It was a link to the settings page, and that was wrong twice over. The
 * settings form edited the account's `name` and email — neither of which the
 * profile shows — so the button promised to change what a reader was looking at
 * and changed nothing they could see. And it navigated away from the thing
 * being edited, which is the one place a form benefits from staying.
 *
 * The one field here is the line under the heading. The heading itself, the
 * username, is assigned when the account is created and cannot be changed: a
 * chosen one was the only thing on an account that could name the anon behind
 * it, and people type their real name into a box labelled "Username".
 *
 * ## Two surfaces, one form
 *
 * Below `md` it rises from the bottom edge as a sheet; at `md` and up it is a
 * centred dialog. Gabe's request, 2026-08-17, and it is the right split: a
 * centred modal on a phone opens across the middle of the screen and then gets
 * shoved by the keyboard, while a sheet from the bottom puts the first field
 * where the thumb already is.
 *
 * They are different Radix primitives, so this is a real branch rather than a
 * restyling — hence `useIsMobile`, which is a `useSyncExternalStore` over
 * `matchMedia` and so answers the same question the `md:` variants elsewhere
 * do. The form itself is built once and handed to whichever surface renders:
 * two copies of two fields, their seeding and their submit is exactly how the
 * two would drift apart.
 */
const BIO_LIMIT = 280;

const TITLE = 'Edit profile';
const DESCRIPTION =
    'The line under your username. Usernames are assigned to keep you anonymous and cannot be changed. Email and password live in settings.';

type EditProfileDialogProps = {
    profile: Profile;
};

function EditProfileDialog({ profile }: EditProfileDialogProps) {
    const [open, setOpen] = useState(false);
    const isMobile = useIsMobile();

    const trigger: ReactNode = (
        /* A quiet chip, not a primary slab. Editing a bio is not this
           page's main action, and a filled primary control at the width the
           row gave it said it was. */
        <Button variant="outline" size="sm">
            {/* A pencil, not a gear. The settings control beside this one is
                a gear now, and two gears on one row said the two buttons did
                the same thing. Editing is the pencil everywhere else. */}
            <PencilIcon aria-hidden="true" />
            {TITLE}
        </Button>
    );

    const form: ReactNode = (
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
    );

    if (isMobile) {
        return (
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>{trigger}</SheetTrigger>

                {/* `max-h`, because the sheet holds a form and a keyboard
                    will take half the screen the moment a field has focus.
                    It scrolls rather than pushing Save out of reach. */}
                <SheetContent
                    side="bottom"
                    className="max-h-[85dvh] overflow-y-auto rounded-t-2xl p-6"
                >
                    <SheetHeader className="p-0">
                        <SheetTitle>{TITLE}</SheetTitle>
                        <SheetDescription>{DESCRIPTION}</SheetDescription>
                    </SheetHeader>

                    {form}
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{TITLE}</DialogTitle>
                    <DialogDescription>{DESCRIPTION}</DialogDescription>
                </DialogHeader>

                {form}
            </DialogContent>
        </Dialog>
    );
}

export { EditProfileDialog };
export type { EditProfileDialogProps };
