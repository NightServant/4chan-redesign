import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TwoFactorRecoveryCodes from '@/components/two-factor-recovery-codes';

const { formState } = vi.hoisted(() => ({
    formState: { processing: false },
}));

vi.mock('@inertiajs/react', () => ({
    Form: ({
        children,
        action,
    }: {
        children: (state: typeof formState) => ReactNode;
        action?: string;
    } & Record<string, unknown>) => (
        <form action={action}>{children(formState)}</form>
    ),
}));

const CODES = ['aaaa-1111', 'bbbb-2222', 'cccc-3333'];

const fetchRecoveryCodes = vi.fn();

beforeEach(() => {
    fetchRecoveryCodes.mockReset();
    formState.processing = false;
});

describe('TwoFactorRecoveryCodes', () => {
    it('keeps the codes hidden until they are asked for', () => {
        render(
            <TwoFactorRecoveryCodes
                recoveryCodesList={CODES}
                fetchRecoveryCodes={fetchRecoveryCodes}
                errors={[]}
            />,
        );

        const toggle = screen.getByRole('button', {
            name: 'View recovery codes',
        });

        expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    it('reveals the codes and reports the expanded state', async () => {
        const user = userEvent.setup();

        render(
            <TwoFactorRecoveryCodes
                recoveryCodesList={CODES}
                fetchRecoveryCodes={fetchRecoveryCodes}
                errors={[]}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'View recovery codes' }),
        );

        const toggle = screen.getByRole('button', {
            name: 'Hide recovery codes',
        });

        expect(toggle).toHaveAttribute('aria-expanded', 'true');

        const list = screen.getByRole('list', { name: 'Recovery codes' });

        expect(within(list).getAllByRole('listitem')).toHaveLength(3);
        expect(list).toHaveTextContent('aaaa-1111');
    });

    it('fetches the codes it does not already hold', () => {
        render(
            <TwoFactorRecoveryCodes
                recoveryCodesList={[]}
                fetchRecoveryCodes={fetchRecoveryCodes}
                errors={[]}
            />,
        );

        expect(fetchRecoveryCodes).toHaveBeenCalled();
    });

    it('offers regeneration only once the codes are on screen', async () => {
        const user = userEvent.setup();

        render(
            <TwoFactorRecoveryCodes
                recoveryCodesList={CODES}
                fetchRecoveryCodes={fetchRecoveryCodes}
                errors={[]}
            />,
        );

        expect(
            screen.queryByRole('button', { name: 'Regenerate codes' }),
        ).toBeNull();

        await user.click(
            screen.getByRole('button', { name: 'View recovery codes' }),
        );

        expect(
            screen.getByRole('button', { name: 'Regenerate codes' }),
        ).toBeInTheDocument();
    });

    it('announces a fetch failure instead of the codes', async () => {
        const user = userEvent.setup();

        render(
            <TwoFactorRecoveryCodes
                recoveryCodesList={[]}
                fetchRecoveryCodes={fetchRecoveryCodes}
                errors={['Recovery codes could not be loaded.']}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'View recovery codes' }),
        );

        expect(screen.getByRole('alert')).toHaveTextContent(
            'Recovery codes could not be loaded.',
        );
        expect(
            screen.queryByRole('list', { name: 'Recovery codes' }),
        ).toBeNull();
    });

    it('sets the codes as machine values so their columns hold still', async () => {
        const user = userEvent.setup();

        render(
            <TwoFactorRecoveryCodes
                recoveryCodesList={CODES}
                fetchRecoveryCodes={fetchRecoveryCodes}
                errors={[]}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'View recovery codes' }),
        );

        const codes = within(
            screen.getByRole('list', { name: 'Recovery codes' }),
        ).getAllByRole('listitem');

        expect(
            codes.every(
                (code) =>
                    code.querySelector('[data-slot="machine-value"]') !== null,
            ),
        ).toBe(true);
    });
});
