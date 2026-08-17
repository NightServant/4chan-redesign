import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PasskeyVerify from '@/components/passkey-verify';

const { verifyState, verify, router } = vi.hoisted(() => ({
    verify: vi.fn(),
    router: { visit: vi.fn() },
    verifyState: {
        isLoading: false,
        error: undefined as string | undefined,
        isSupported: true,
    },
}));

vi.mock('@inertiajs/react', () => ({ router }));

vi.mock('@laravel/passkeys/react', () => ({
    usePasskeyVerify: () => ({ ...verifyState, verify }),
}));

beforeEach(() => {
    verify.mockReset();
    router.visit.mockClear();
    verifyState.isLoading = false;
    verifyState.error = undefined;
    verifyState.isSupported = true;
});

describe('PasskeyVerify', () => {
    it('renders nothing when the browser cannot do passkeys', () => {
        verifyState.isSupported = false;

        const { container } = render(<PasskeyVerify />);

        expect(container).toBeEmptyDOMElement();
    });

    it('offers the default sign-in action and separator copy', () => {
        render(<PasskeyVerify />);

        expect(
            screen.getByRole('button', { name: 'Sign in with a passkey' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Or continue with email')).toBeInTheDocument();
    });

    /**
     * Task 13, fix 2. The rule was an `absolute inset-0` layer with the label
     * floated over it on a `bg-surface` chip that masked the line behind it.
     * That holds only while the label sets on one line: `OR CONTINUE WITH
     * EMAIL` does, and `OR CONFIRM WITH PASSWORD` on the confirm-password
     * screen wraps to two at ~320px — the row grows, the absolute rule stays
     * vertically centred, and the line runs straight through the middle of the
     * text.
     *
     * A real flex row cannot do that: the label is a sibling of the two rules
     * rather than a layer over one, so the row's height is the label's height
     * and the rules sit beside it however many lines it takes. The masking
     * fill goes with the overlay, because there is nothing left to mask.
     */
    it('sets the divider label beside its rules rather than over them', () => {
        const { container } = render(
            <PasskeyVerify separator="Or confirm with password" />,
        );

        const label = screen.getByText('Or confirm with password');
        const row = label.parentElement;

        expect(row?.className).toMatch(/(^|\s)flex(\s|$)/);
        expect(label.className).not.toMatch(/absolute/);
        expect(label.className).not.toMatch(/bg-surface/);

        /* The rules are siblings on the same row, one either side. */
        const rules = row?.querySelectorAll('[data-slot="separator-root"]');

        expect(rules).toHaveLength(2);

        /* And nothing in the whole control is taken out of flow.
           `getAttribute` rather than `.className`, because an SVG's is an
           `SVGAnimatedString` and not a string at all. */
        for (const node of Array.from(container.querySelectorAll('*'))) {
            expect(node.getAttribute('class') ?? '').not.toMatch(
                /(^|\s)absolute(\s|$)/,
            );
        }
    });

    it('takes overridden copy from the page that hosts it', () => {
        render(
            <PasskeyVerify
                label="Confirm with a passkey"
                separator="Or use your password"
            />,
        );

        expect(
            screen.getByRole('button', { name: 'Confirm with a passkey' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Or use your password')).toBeInTheDocument();
    });

    it('starts verification when pressed', async () => {
        const user = userEvent.setup();

        render(<PasskeyVerify />);

        await user.click(
            screen.getByRole('button', { name: 'Sign in with a passkey' }),
        );

        expect(verify).toHaveBeenCalled();
    });

    it('reports progress and blocks a second press while working', () => {
        verifyState.isLoading = true;

        render(<PasskeyVerify loadingLabel="Waiting for your device" />);

        expect(
            screen.getByRole('button', { name: /waiting for your device/i }),
        ).toBeDisabled();
    });

    it('announces a verification failure', () => {
        verifyState.error = 'That passkey was not recognised.';

        render(<PasskeyVerify />);

        expect(screen.getByRole('alert')).toHaveTextContent(
            'That passkey was not recognised.',
        );
    });
});
