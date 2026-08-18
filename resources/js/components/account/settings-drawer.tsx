import { LogOutIcon, SettingsIcon, ShieldIcon } from 'lucide-react';
import { useState } from 'react';
import { AppearanceRow } from '@/components/account/appearance-row';
import { SettingsRow } from '@/components/account/settings-row';
import { MatureBoardsToggle } from '@/components/settings/mature-boards-toggle';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { logout } from '@/routes';
import { edit as editTwoFactor } from '@/routes/two-factor';

/**
 * The account settings, as a drawer from the bottom edge, below `md` only.
 *
 * These four rows arrived on the account screen in task 4, when the avatar
 * dropdown was hidden below `md` and everything it carried needed somewhere
 * to go. They were stacked at the foot of the page as three controls in three
 * idioms — a switch, an outlined button and a filled destructive one — which
 * put the loudest thing on the screen at the bottom of a page an anon opens
 * to read their own replies.
 *
 * Gabe's decision, 2026-08-17: a settings control beside "Edit profile"
 * opening a drawer. Settings are not part of a profile; they are what you go
 * *to* from one, and a drawer says that without spending the page on it.
 *
 * `md:hidden` on the trigger, because at `md` and up every one of these is
 * still in the avatar dropdown, where the header has room for it.
 */
function SettingsDrawer() {
    const [open, setOpen] = useState(false);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    aria-label="Account settings"
                    className="md:hidden"
                >
                    <SettingsIcon aria-hidden="true" />
                </Button>
            </SheetTrigger>

            {/* Bounded and scrollable: the adult-boards row carries three
                lines of explanation, and a drawer that grows past the
                viewport puts Sign out somewhere no thumb can reach. */}
            <SheetContent
                side="bottom"
                className="max-h-[85dvh] overflow-y-auto rounded-t-2xl p-6"
            >
                <SheetHeader className="p-0">
                    <SheetTitle>Settings</SheetTitle>
                </SheetHeader>

                <div>
                    <AppearanceRow />

                    {/* The switch keeps its own explanation, so it is a row
                        with a body rather than a row with a chevron. Same
                        `MatureBoardsToggle` that `/settings` renders, not a
                        third copy of a control that writes. */}
                    <div className="border-b border-border px-1 py-4">
                        <MatureBoardsToggle />
                    </div>

                    <SettingsRow
                        icon={<ShieldIcon aria-hidden="true" />}
                        label="Two-factor authentication"
                        href={editTwoFactor()}
                    />

                    {/* Still a POST. `as="button"` keeps it a real submitting
                        control, and `logout()` carries the method, which a
                        bare "/logout" string would lose — a GET to a
                        POST-only route, which is how this shipped once
                        already with a green suite.

                        No destructive red. Colour on the entry point shouts
                        every time the drawer opens for something else; it
                        belongs on a confirmation, where there is something to
                        warn about. */}
                    <SettingsRow
                        icon={<LogOutIcon aria-hidden="true" />}
                        label="Sign out"
                        href={logout()}
                        as="button"
                    />
                </div>
            </SheetContent>
        </Sheet>
    );
}

export { SettingsDrawer };
