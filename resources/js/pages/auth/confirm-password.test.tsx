import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ConfirmPassword from '@/pages/auth/confirm-password';

const { formState } = vi.hoisted(() => ({
    formState: {
        processing: false,
        errors: {} as Record<string, string>,
    },
}));

vi.mock('@inertiajs/react', () => ({
    /* `PageMeta` reads the shared `appUrl` to build an absolute `og:url`, and
       renders its tags inside `Head`. Neither shows up in the DOM these tests
       query; the mock exists so the component can mount. */
    usePage: () => ({ props: { appUrl: 'https://clover.test' }, url: '/' }),
    Head: () => null,
    router: { visit: vi.fn() },
    Form: ({
        children,
        action,
        method,
    }: {
        children: (state: typeof formState) => ReactNode;
        action?: string;
        method?: string;
    } & Record<string, unknown>) => (
        <form action={action} data-method={method}>
            {children(formState)}
        </form>
    ),
}));

vi.mock('@laravel/passkeys/react', () => ({
    usePasskeyVerify: () => ({
        verify: vi.fn(),
        isLoading: false,
        error: null,
        isSupported: true,
    }),
}));

beforeEach(() => {
    formState.processing = false;
    formState.errors = {};
});

describe('ConfirmPassword page', () => {
    it('posts to the password confirmation route', () => {
        const { container } = render(<ConfirmPassword />);

        const form = container.querySelector('form');

        expect(form).toHaveAttribute('action', '/user/confirm-password');
        expect(form).toHaveAttribute('data-method', 'post');
    });

    it('asks for the password under the name the backend expects', () => {
        render(<ConfirmPassword />);

        expect(screen.getByLabelText('Password')).toHaveAttribute(
            'name',
            'password',
        );
    });

    it('keeps the passkey confirmation path with its own wording', () => {
        render(<ConfirmPassword />);

        expect(
            screen.getByRole('button', { name: 'Confirm with passkey' }),
        ).toBeInTheDocument();
    });

    it('keeps the submit hook the feature tests select on', () => {
        render(<ConfirmPassword />);

        expect(
            screen.getByRole('button', { name: 'Confirm password' }),
        ).toHaveAttribute('data-test', 'confirm-password-button');
    });

    it('reports a wrong password against the field', () => {
        formState.errors = { password: 'That password is incorrect.' };

        render(<ConfirmPassword />);

        expect(screen.getByRole('alert')).toHaveTextContent(
            'That password is incorrect.',
        );
    });
});
