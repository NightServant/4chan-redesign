import { Form, Head, Link, usePage } from '@inertiajs/react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import { FormField } from '@/components/clover/form-field';
import { Panel } from '@/components/clover/panel';
import DeleteUser from '@/components/delete-user';
import { MatureBoardsToggle } from '@/components/settings/mature-boards-toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { send } from '@/routes/verification';
import type { Auth } from '@/types';

type PageProps = {
    auth: Auth;
};

/**
 * The settings layout supplies this screen's h1, so nothing here renders a
 * heading of its own. Each region is a `Panel`, which names it for assistive
 * technology without adding a second heading level to the outline.
 */
export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage<PageProps>().props;

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
            <Head title="Profile settings" />

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
                            <FormField label="Name" error={errors.name}>
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
