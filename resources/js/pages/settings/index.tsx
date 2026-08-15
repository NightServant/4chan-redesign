import { Form, Link, usePage } from '@inertiajs/react';
import { LockIcon } from 'lucide-react';
import { useRef } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import SecurityController from '@/actions/App/Http/Controllers/Settings/SecurityController';
import { FormField } from '@/components/clover/form-field';
import { PageMeta } from '@/components/clover/page-meta';
import { Panel } from '@/components/clover/panel';
import DeleteUser from '@/components/delete-user';
import type { Props as ManagePasskeysProps } from '@/components/manage-passkeys';
import ManagePasskeys from '@/components/manage-passkeys';
import type { Props as ManageTwoFactorProps } from '@/components/manage-two-factor';
import ManageTwoFactor from '@/components/manage-two-factor';
import PasswordInput from '@/components/password-input';
import { MatureBoardsToggle } from '@/components/settings/mature-boards-toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { confirm as confirmPassword } from '@/routes/settings';
import { send } from '@/routes/verification';
import type { Auth } from '@/types';

/**
 * Every setting this account has, on one screen.
 *
 * There were two — `settings/profile` and `settings/security` — and the split
 * described nothing a reader would go looking for. Changing an email address
 * and changing a password are the same errand, and separating them bought a
 * section nav whose only job was moving between two pages of three panels.
 *
 * The settings layout supplies this screen's h1, so nothing here renders a
 * heading of its own. Each region is a `Panel`, which names it for assistive
 * technology without adding a second heading level to the outline.
 *
 * ## The order is the order an anon needs them in
 *
 * Who you are, then what you see, then how you get in, then the way out. The
 * destructive one is last, which is the only position it can hold on a page
 * this long without being something a reader scrolls past on the way to
 * everything else.
 */
type PageProps = {
    auth: Auth;
};

type SettingsProps = {
    mustVerifyEmail: boolean;
    status?: string;
    passwordRules: string;
    /**
     * Whether the password has been confirmed recently enough to show the two
     * panels the old security page kept behind `RequirePassword`. False sends
     * the anon to `settings/confirm` rather than rendering empty panels.
     */
    securityUnlocked: boolean;
} & ManagePasskeysProps &
    ManageTwoFactorProps;

/**
 * Stands in for two-factor and passkeys until the password has been confirmed.
 *
 * Not an empty panel and not a hidden one. An empty panel reads as a broken
 * feature; a hidden one leaves an anon who came from the header's "Two-factor
 * authentication" link on a page that appears not to have it.
 */
function LockedPanel({ title, id }: { title: string; id?: string }) {
    return (
        <Panel title={title} id={id}>
            <div className="flex flex-col items-start gap-3">
                <p className="text-body-sm text-muted-foreground">
                    Confirm your password to see and change this. It is the one
                    part of settings that someone sitting down at your unlocked
                    screen should not be able to read.
                </p>

                <Button variant="outline" asChild>
                    <Link href={confirmPassword()}>
                        <LockIcon aria-hidden="true" />
                        Confirm password
                    </Link>
                </Button>
            </div>
        </Panel>
    );
}

export default function Settings({
    mustVerifyEmail,
    status,
    passwordRules,
    securityUnlocked,
    canManageTwoFactor,
    requiresConfirmation,
    twoFactorEnabled,
    canManagePasskeys,
    passkeys,
}: SettingsProps) {
    const { auth } = usePage<PageProps>().props;
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    /**
     * The route is behind auth middleware, so a signed-out anon never reaches
     * this page. Narrowing rather than asserting keeps that assumption written
     * down: if the route is ever opened up, this renders nothing instead of
     * throwing on a null dereference.
     */
    const user = auth.user;

    if (!user) {
        return null;
    }

    return (
        <>
            <PageMeta
                title="Settings"
                description="Your account name, email, password, two-factor, passkeys and what Clover shows you."
            />

            <Panel title="Profile information">
                <Form
                    {...ProfileController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    className="flex flex-col gap-5"
                >
                    {({ processing, errors }) => (
                        <>
                            {/* Fortify owns `name`, and it is what an anon
                                typed at registration rather than anything the
                                profile shows -- labelled for what it is, so it
                                is not mistaken for the username at the top of
                                the account screen.

                                The username and bio are not on this form. They
                                are edited in a dialog on the account screen,
                                beside the profile they appear on, and two
                                editors for one set of fields is how the two
                                drift apart. */}
                            <FormField
                                label="Account name"
                                description="Private. Used on receipts and account email, never on your profile."
                                error={errors.name}
                            >
                                <Input
                                    id="name"
                                    name="name"
                                    defaultValue={user.name}
                                    required
                                    autoComplete="name"
                                    placeholder="Full name"
                                />
                            </FormField>

                            <FormField
                                label="Email address"
                                error={errors.email}
                            >
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    defaultValue={user.email}
                                    required
                                    autoComplete="username"
                                    placeholder="Email address"
                                />
                            </FormField>

                            {mustVerifyEmail &&
                                user.email_verified_at === null && (
                                    <div className="flex flex-col gap-1">
                                        <p className="text-body-sm text-muted-foreground">
                                            This email address is unverified.{' '}
                                            <Link
                                                href={send()}
                                                as="button"
                                                className="text-primary underline underline-offset-4 transition-colors duration-[var(--duration-hover)] ease-standard hover:text-primary-hover"
                                            >
                                                Re-send the verification email.
                                            </Link>
                                        </p>

                                        {status ===
                                            'verification-link-sent' && (
                                            <p className="text-body-sm font-medium text-success">
                                                A new verification link has been
                                                sent to that address.
                                            </p>
                                        )}
                                    </div>
                                )}

                            <div className="flex items-center gap-3">
                                <Button
                                    disabled={processing}
                                    data-test="update-profile-button"
                                >
                                    Save
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </Panel>

            <Panel title="Content">
                <MatureBoardsToggle />
            </Panel>

            <Panel title="Password">
                <Form
                    {...SecurityController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    resetOnError={[
                        'password',
                        'password_confirmation',
                        'current_password',
                    ]}
                    resetOnSuccess
                    onError={(errors) => {
                        if (errors.password) {
                            passwordInput.current?.focus();
                        }

                        if (errors.current_password) {
                            currentPasswordInput.current?.focus();
                        }
                    }}
                    className="flex flex-col gap-5"
                >
                    {({ errors, processing }) => (
                        <>
                            <FormField
                                label="Current password"
                                error={errors.current_password}
                            >
                                <PasswordInput
                                    id="current_password"
                                    ref={currentPasswordInput}
                                    name="current_password"
                                    autoComplete="current-password"
                                    placeholder="Current password"
                                />
                            </FormField>

                            <FormField
                                label="New password"
                                description="Long and random beats short and clever. A password manager handles both."
                                error={errors.password}
                            >
                                <PasswordInput
                                    id="password"
                                    ref={passwordInput}
                                    name="password"
                                    autoComplete="new-password"
                                    placeholder="New password"
                                    passwordrules={passwordRules}
                                />
                            </FormField>

                            <FormField
                                label="Confirm password"
                                error={errors.password_confirmation}
                            >
                                <PasswordInput
                                    id="password_confirmation"
                                    name="password_confirmation"
                                    autoComplete="new-password"
                                    placeholder="Confirm password"
                                    passwordrules={passwordRules}
                                />
                            </FormField>

                            <div className="flex items-center gap-3">
                                <Button
                                    disabled={processing}
                                    data-test="update-password-button"
                                >
                                    Save
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </Panel>

            {/* The two feature panels are gated on the same flags their
                components check. That looks like a duplicated guard, and is
                not: a component returning null inside a `Panel` leaves a
                titled, empty region on the page, which reads as a broken
                feature rather than an absent one.

                The id is the header's target. Its avatar menu links straight
                at two-factor, and on a page this long that has to land on the
                panel rather than at the top of the document. */}
            {canManageTwoFactor ? (
                securityUnlocked ? (
                    <Panel id="two-factor" title="Two-factor authentication">
                        <ManageTwoFactor
                            canManageTwoFactor={canManageTwoFactor}
                            requiresConfirmation={requiresConfirmation}
                            twoFactorEnabled={twoFactorEnabled}
                        />
                    </Panel>
                ) : (
                    <LockedPanel
                        id="two-factor"
                        title="Two-factor authentication"
                    />
                )
            ) : null}

            {canManagePasskeys ? (
                securityUnlocked ? (
                    <Panel title="Passkeys">
                        <ManagePasskeys
                            canManagePasskeys={canManagePasskeys}
                            passkeys={passkeys}
                        />
                    </Panel>
                ) : (
                    <LockedPanel title="Passkeys" />
                )
            ) : null}

            {/* `Panel` forwards className to the section, not to the card it
                wraps, so the danger border is reached through the card slot
                rather than by rebuilding the panel here. */}
            <Panel
                title="Delete account"
                className="[&_[data-slot=card]]:border-danger-line"
            >
                <DeleteUser />
            </Panel>
        </>
    );
}
