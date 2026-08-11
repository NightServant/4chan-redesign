import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Profile from '@/pages/settings/profile';
import type { User } from '@/types/auth';

/**
 * Inertia's `Form` is a render-prop component wired to a real app context.
 * The mock renders a real `form` element carrying the same action and method,
 * then hands the child the state the page branches on, so the page's error and
 * processing paths stay observable without a server.
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

const USER: User = {
    id: 1,
    name: 'Anon',
    email: 'anon@example.com',
    email_verified_at: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
};

function mockPage(user: User | null = USER): void {
    usePage.mockReturnValue({
        url: '/settings/profile',
        props: { auth: { user } },
    });
}

beforeEach(() => {
    formState.processing = false;
    formState.errors = {};
    mockPage();
});

describe('Profile settings', () => {
    it('never renders its own h1, because the layout supplies one', () => {
        render(<Profile mustVerifyEmail={false} />);

        expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    });

    it('renders the profile and delete regions as landmarks', () => {
        render(<Profile mustVerifyEmail={false} />);

        expect(
            screen.getByRole('region', { name: 'Profile information' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('region', { name: 'Delete account' }),
        ).toBeInTheDocument();
    });

    it('labels the name and email controls and seeds them from the anon', () => {
        render(<Profile mustVerifyEmail={false} />);

        expect(screen.getByLabelText('Name')).toHaveValue('Anon');
        expect(screen.getByLabelText('Email address')).toHaveValue(
            'anon@example.com',
        );
    });

    it('keeps the name attributes the update request is built from', () => {
        render(<Profile mustVerifyEmail={false} />);

        expect(screen.getByLabelText('Name')).toHaveAttribute('name', 'name');
        expect(screen.getByLabelText('Email address')).toHaveAttribute(
            'name',
            'email',
        );
    });

    it('announces a validation failure and marks the control invalid', () => {
        formState.errors = { email: 'The email has already been taken.' };

        render(<Profile mustVerifyEmail={false} />);

        expect(screen.getByRole('alert')).toHaveTextContent(
            'The email has already been taken.',
        );
        expect(screen.getByLabelText('Email address')).toHaveAttribute(
            'aria-invalid',
            'true',
        );
    });

    it('offers to re-send verification only while the email is unverified', () => {
        mockPage({ ...USER, email_verified_at: null });

        render(<Profile mustVerifyEmail />);

        expect(
            screen.getByRole('link', {
                name: /re-send the verification email/i,
            }),
        ).toBeInTheDocument();
    });

    it('hides the verification notice once the email is verified', () => {
        render(<Profile mustVerifyEmail />);

        expect(
            screen.queryByRole('link', {
                name: /re-send the verification email/i,
            }),
        ).toBeNull();
    });

    it('confirms a sent verification link', () => {
        mockPage({ ...USER, email_verified_at: null });

        render(<Profile mustVerifyEmail status="verification-link-sent" />);

        expect(
            screen.getByText(/new verification link has been sent/i),
        ).toBeInTheDocument();
    });

    it('keeps the save button hook and disables it while the form is in flight', () => {
        formState.processing = true;

        render(<Profile mustVerifyEmail={false} />);

        const save = screen.getByRole('button', { name: 'Save' });

        expect(save).toHaveAttribute('data-test', 'update-profile-button');
        expect(save).toBeDisabled();
    });

    it('renders nothing for a signed-out anon', () => {
        mockPage(null);

        const { container } = render(<Profile mustVerifyEmail={false} />);

        expect(container).toBeEmptyDOMElement();
    });
});
