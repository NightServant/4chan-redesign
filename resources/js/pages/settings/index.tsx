import { Form, Link, usePage } from '@inertiajs/react';
import { LockIcon, ShieldIcon } from 'lucide-react';
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
import PasswordInput from '@/components/password-input';
import { MatureBoardsToggle } from '@/components/settings/mature-boards-toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { confirm as confirmPassword } from '@/routes/settings';
import { edit as editTwoFactor } from '@/routes/two-factor';
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
                            {/* No account name. The column is gone: it
                                held whatever an anon typed at registration,
                                it was the heading on their public profile
                                until task 17c stopped that, and nothing on
                                the site needs it. What identifies an account
                                is its email; what identifies an anon is the
                                handle they choose, edited from the account
                                screen beside the profile it appears on. */}
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

            {/* Two-factor has a page of its own, so this is a status row and
                a way to it rather than a second place to manage it. Reading
                whether it is on is worth having beside the rest of the
                account; turning it on and off is not something to offer in
                two places, which is how the two drift apart.

                The state is safe to show unconfirmed — it is one bit, and an
                anon who can see this page can see it. Everything the page
                behind the link reveals stays behind `RequirePassword`. */}
            {canManageTwoFactor ? (
                <Panel id="two-factor" title="Two-factor authentication">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-body-sm text-muted-foreground">
                            {twoFactorEnabled
                                ? 'On. Signing in asks for a code from your authenticator app.'
                                : 'Off. Signing in needs only your password.'}
                        </p>

                        <Button variant="outline" asChild>
                            <Link href={editTwoFactor()}>
                                <ShieldIcon aria-hidden="true" />
                                {twoFactorEnabled ? 'Manage' : 'Turn on'}
                            </Link>
                        </Button>
                    </div>
                </Panel>
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
