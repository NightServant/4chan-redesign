import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TwoFactorChallenge from '@/pages/auth/two-factor-challenge';

const { formState, setLayoutProps } = vi.hoisted(() => ({
    formState: {
        processing: false,
        errors: {} as Record<string, string>,
        clearErrors: vi.fn(),
    },
    setLayoutProps: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({
    /* `PageMeta` reads the shared `appUrl` to build an absolute `og:url`, and
       renders its tags inside `Head`. Neither shows up in the DOM these tests
       query; the mock exists so the component can mount. */
    usePage: () => ({ props: { appUrl: 'https://clover.test' }, url: '/' }),
    Head: () => null,
    setLayoutProps,
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

beforeEach(() => {
    formState.processing = false;
    formState.errors = {};
    formState.clearErrors.mockClear();
    setLayoutProps.mockClear();
});

describe('TwoFactorChallenge page', () => {
    it('posts to the two-factor login route', () => {
        const { container } = render(<TwoFactorChallenge />);

        const form = container.querySelector('form');

        expect(form).toHaveAttribute('action', '/two-factor-challenge');
        expect(form).toHaveAttribute('data-method', 'post');
    });

    it('names the one-time code field for assistive technology', () => {
        render(<TwoFactorChallenge />);

        expect(screen.getByLabelText('Authentication code')).toHaveAttribute(
            'name',
            'code',
        );
    });

    it('titles the card through the layout rather than a second heading', () => {
        render(<TwoFactorChallenge />);

        expect(setLayoutProps).toHaveBeenCalledWith(
            expect.objectContaining({ title: 'Authentication code' }),
        );
    });

    it('swaps to the recovery code field and back', async () => {
        const user = userEvent.setup();

        render(<TwoFactorChallenge />);

        await user.click(
            screen.getByRole('button', {
                name: 'sign in using a recovery code',
            }),
        );

        expect(screen.getByLabelText('Recovery code')).toHaveAttribute(
            'name',
            'recovery_code',
        );
        expect(formState.clearErrors).toHaveBeenCalled();

        await user.click(
            screen.getByRole('button', {
                name: 'sign in using an authentication code',
            }),
        );

        expect(screen.getByLabelText('Authentication code')).toHaveAttribute(
            'name',
            'code',
        );
    });

    it('reports a rejected code against the field', () => {
        formState.errors = { code: 'That code is invalid.' };

        render(<TwoFactorChallenge />);

        expect(screen.getByRole('alert')).toHaveTextContent(
            'That code is invalid.',
        );
    });

    /**
     * Task 13, fix 2 — the type scale half of it, and the one place on these
     * screens that genuinely predated the tokens in `app.css`.
     *
     * The OTP slots came from the starter kit untouched: raw `text-sm` rather
     * than a token, `border-input` rather than `border-border`, a `shadow-sm`
     * on a design that draws no shadows, and 36px boxes on a branch whose task
     * 5 put every touch target at 44px. Every other control on an auth screen
     * is 44px and on the token scale; this one was neither.
     */
    it('sets the code slots on the token scale and the 44px target', () => {
        const { container } = render(<TwoFactorChallenge />);

        const slots = Array.from(
            container.querySelectorAll<HTMLElement>(
                '[data-slot="input-otp-slot"]',
            ),
        );

        expect(slots.length).toBeGreaterThan(0);

        for (const slot of slots) {
            expect(slot.className).toMatch(/(^|\s)text-body(\s|$)/);
            expect(slot.className).not.toMatch(/(^|\s)text-sm(\s|$)/);
            expect(slot.className).toMatch(/border-border/);
            expect(slot.className).not.toMatch(/border-input/);
            expect(slot.className).not.toMatch(/shadow-/);
            expect(slot.className).toMatch(/(^|\s)size-11(\s|$)/);
        }
    });

    it('keeps a submit control that is disabled while the code is checked', () => {
        formState.processing = true;

        render(<TwoFactorChallenge />);

        expect(screen.getByRole('button', { name: /Continue/ })).toBeDisabled();
    });
});
