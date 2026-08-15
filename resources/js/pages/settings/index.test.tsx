import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Settings from '@/pages/settings/index';
import type { User } from '@/types/auth';

/**
 * This file is the two suites that used to test `settings/profile` and
 * `settings/security`, merged the way the pages were. Every assertion either
 * side made is still here — the panels, the labels, the name attributes the
 * requests are built from, the error paths, the feature gating — because the
 * pages merging is not a reason for the coverage to.
 *
 * What is new is the password gate: two panels that render a prompt instead of
 * their contents until the password has been confirmed.
 *
 * Inertia's `Form` is a render-prop component wired to a real app context. The
 * mock renders a real `form` carrying the same action and method, then hands
 * the child the state the page branches on, so the error and processing paths
 * stay observable without a server.
 */
const { usePage, formState } = vi.hoisted(() => ({
    usePage: vi.fn(),
    formState: {
        processing: false,
        errors: {} as Record<string, string>,
    },
}));

vi.mock('@inertiajs/react', () => ({
    usePage,
    Head: () => null,
    Link: ({
        href,
        children,
        ...props
    }: {
        href: string | { url: string };
        children: ReactNode;
    } & Record<string, unknown>) => (
        <a href={typeof href === 'string' ? href : href.url} {...props}>
            {children}
        </a>
    ),
    Form: ({
        children,
        action,
        method,
    }: {
        children: (state: typeof formState) => ReactNode;
        action?: string;
        method?: string;
    } & Record<string, unknown>) => (
        <form action={action} method={method} data-testid="inertia-form">
            {children(formState)}
        </form>
    ),
}));

/* The two security surfaces own their own suites. What this page is
   responsible for is the panels around them and the gating that decides
   whether they appear at all. */
vi.mock('@/components/manage-two-factor', () => ({
    default: () => <div data-testid="manage-two-factor" />,
}));

vi.mock('@/components/manage-passkeys', () => ({
    default: () => <div data-testid="manage-passkeys" />,
}));

const USER: User = {
    id: 1,
    email: 'anon@example.com',
    email_verified_at: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
};

const BASE_PROPS = {
    mustVerifyEmail: false,
    passwordRules: 'minlength: 8;',
    securityUnlocked: true,
    canManageTwoFactor: true,
    requiresConfirmation: true,
    twoFactorEnabled: false,
    canManagePasskeys: true,
    passkeys: [],
};

function mockPage(user: User | null = USER): void {
    usePage.mockReturnValue({
        url: '/settings',
        props: { auth: { user } },
    });
}

function renderSettings(props: Partial<typeof BASE_PROPS> = {}) {
    return render(<Settings {...BASE_PROPS} {...props} />);
}

/** Both forms have a "Save", so every save assertion names its region first. */
function saveIn(region: string): HTMLElement {
    return within(screen.getByRole('region', { name: region })).getByRole(
        'button',
        { name: 'Save' },
    );
}

beforeEach(() => {
    formState.processing = false;
    formState.errors = {};
    mockPage();
});

describe('Settings', () => {
    it('never renders its own h1, because the layout supplies one', () => {
        renderSettings();

        expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    });

    /**
     * The whole point of the merge. Two pages of three panels became one page
     * of six, so the guard is that all six are on it: a panel quietly lost in
     * a merge is a setting an anon can no longer reach at all.
     */
    it('carries every panel both pages used to hold, as landmarks', () => {
        renderSettings();

        for (const name of [
            'Profile information',
            'Content',
            'Password',
            'Two-factor authentication',
            'Passkeys',
            'Delete account',
        ]) {
            expect(screen.getByRole('region', { name })).toBeInTheDocument();
        }
    });

    it('labels the account controls and seeds them from the anon', () => {
        renderSettings();

        expect(screen.getByLabelText('Email address')).toHaveValue(
            'anon@example.com',
        );
    });

    /**
     * Accounts no longer hold a name. The column is dropped: registration
     * asked for a full name on a site whose premise is that it does not know
     * who you are, and it was the heading on a public profile until 17c.
     */
    it('asks for no name, because an account no longer has one', () => {
        renderSettings();

        expect(screen.queryByLabelText(/name/i)).not.toBeInTheDocument();
    });

    it('keeps the name attributes the profile request is built from', () => {
        renderSettings();

        expect(screen.getByLabelText('Email address')).toHaveAttribute(
            'name',
            'email',
        );
    });

    /**
     * The username and bio are not on this form. They are the two fields the
     * account screen displays, and they are edited in a dialog on that screen,
     * beside the profile they appear on. Two editors for one set of fields is
     * how the two drift apart, so this is asserted as an absence.
     */
    it('does not also edit what the account screen shows', () => {
        renderSettings();

        expect(screen.queryByLabelText('Username')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Bio')).not.toBeInTheDocument();
    });

    it('labels all three password controls', () => {
        renderSettings();

        expect(screen.getByLabelText('Current password')).toBeInTheDocument();
        expect(screen.getByLabelText('New password')).toBeInTheDocument();
        expect(screen.getByLabelText('Confirm password')).toBeInTheDocument();
    });

    it('keeps the name attributes the password request is built from', () => {
        renderSettings();

        expect(screen.getByLabelText('Current password')).toHaveAttribute(
            'name',
            'current_password',
        );
        expect(screen.getByLabelText('New password')).toHaveAttribute(
            'name',
            'password',
        );
        expect(screen.getByLabelText('Confirm password')).toHaveAttribute(
            'name',
            'password_confirmation',
        );
    });

    it('passes the server password rules to both new-password controls', () => {
        renderSettings();

        expect(screen.getByLabelText('New password')).toHaveAttribute(
            'passwordrules',
            'minlength: 8;',
        );
        expect(screen.getByLabelText('Confirm password')).toHaveAttribute(
            'passwordrules',
            'minlength: 8;',
        );
    });

    it('announces a wrong current password against its control', () => {
        formState.errors = {
            current_password: 'The password is incorrect.',
        };

        renderSettings();

        expect(screen.getByLabelText('Current password')).toHaveAttribute(
            'aria-invalid',
            'true',
        );
        expect(
            screen.getAllByRole('alert').map((alert) => alert.textContent),
        ).toContain('The password is incorrect.');
    });

    /**
     * Two forms on one page, each with a "Save". They must stay wired to their
     * own submit hooks: one page of six panels is exactly the shape where a
     * button ends up posting the neighbouring form and nobody notices.
     */
    it('keeps each save button on its own form', () => {
        formState.processing = true;

        renderSettings();

        expect(saveIn('Profile information')).toHaveAttribute(
            'data-test',
            'update-profile-button',
        );
        expect(saveIn('Password')).toHaveAttribute(
            'data-test',
            'update-password-button',
        );
        expect(saveIn('Profile information')).toBeDisabled();
        expect(saveIn('Password')).toBeDisabled();
    });

    it('drops the two-factor panel when the feature is unavailable', () => {
        renderSettings({ canManageTwoFactor: false });

        expect(
            screen.queryByRole('region', {
                name: 'Two-factor authentication',
            }),
        ).toBeNull();
        expect(screen.queryByTestId('manage-two-factor')).toBeNull();
    });

    it('drops the passkeys panel when the feature is unavailable', () => {
        renderSettings({ canManagePasskeys: false });

        expect(screen.queryByRole('region', { name: 'Passkeys' })).toBeNull();
        expect(screen.queryByTestId('manage-passkeys')).toBeNull();
    });

    it('renders nothing for a signed-out anon', () => {
        mockPage(null);

        const { container } = renderSettings();

        expect(container).toBeEmptyDOMElement();
    });

    /**
     * The security page carried `RequirePassword`, so reading it meant proving
     * you were the account holder rather than someone at an unlocked laptop.
     * Merging naively would have thrown that away: passkey names and whether
     * two-factor is on would render for anyone holding a live session.
     *
     * Asserted as an absence, because every other test in this file passes
     * with the gate deleted.
     */
    it('shows neither security surface until the password is confirmed', () => {
        renderSettings({ securityUnlocked: false });

        expect(screen.queryByTestId('manage-two-factor')).toBeNull();
        expect(screen.queryByTestId('manage-passkeys')).toBeNull();
    });

    /**
     * Locked, not hidden. An anon arriving from the header's "Two-factor
     * authentication" link must not land on a page that appears not to have
     * two-factor at all.
     */
    it('keeps the passkeys panel present while locked, with a way through', () => {
        renderSettings({ securityUnlocked: false });

        const passkeys = screen.getByRole('region', { name: 'Passkeys' });

        expect(
            within(passkeys).getByRole('link', { name: /confirm password/i }),
        ).toHaveAttribute('href', '/settings/confirm');
    });

    /**
     * Two-factor is a page now, not a panel. This row reports the state and
     * links there; managing it in two places is how the two drift apart.
     */
    it('reports the two-factor state and links at its own page', () => {
        renderSettings({ twoFactorEnabled: true });

        const row = screen.getByRole('region', {
            name: 'Two-factor authentication',
        });

        expect(row).toHaveTextContent(/On\./);
        expect(
            within(row).getByRole('link', { name: 'Manage' }),
        ).toHaveAttribute('href', '/settings/two-factor');
    });

    /**
     * The state is shown whether or not the password has been confirmed. A row
     * that said "Off" because the state was withheld would tell an anon their
     * account is unprotected when it is not.
     */
    it('reports the state even while the rest is locked', () => {
        renderSettings({ securityUnlocked: false, twoFactorEnabled: true });

        expect(
            screen.getByRole('region', { name: 'Two-factor authentication' }),
        ).toHaveTextContent(/On\./);
    });

    it('says it is off when it is', () => {
        renderSettings({ twoFactorEnabled: false });

        const row = screen.getByRole('region', {
            name: 'Two-factor authentication',
        });

        expect(row).toHaveTextContent(/Off\./);
        expect(
            within(row).getByRole('link', { name: 'Turn on' }),
        ).toBeInTheDocument();
    });

    /** It does not manage two-factor, which is the point of the split. */
    it('offers no two-factor controls of its own', () => {
        renderSettings();

        expect(screen.queryByTestId('manage-two-factor')).toBeNull();
    });
});
