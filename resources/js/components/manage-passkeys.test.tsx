import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ManagePasskeys from '@/components/manage-passkeys';
import type { Passkey } from '@/types/auth';

const { router } = vi.hoisted(() => ({
    router: { delete: vi.fn(), reload: vi.fn() },
}));

vi.mock('@inertiajs/react', () => ({ router }));

vi.mock('@/components/passkey-register', () => ({
    default: () => <div data-testid="passkey-register" />,
}));

const PASSKEYS: Passkey[] = [
    {
        id: 1,
        name: 'Chrome on Mac',
        authenticator: 'iCloud Keychain',
        created_at_diff: '2 days ago',
        last_used_at_diff: '1 hour ago',
    },
    {
        id: 2,
        name: 'iPhone',
        authenticator: null,
        created_at_diff: '3 weeks ago',
        last_used_at_diff: null,
    },
];

beforeEach(() => {
    router.delete.mockClear();
    router.reload.mockClear();
});

describe('ManagePasskeys', () => {
    it('renders nothing when the feature is unavailable', () => {
        const { container } = render(
            <ManagePasskeys canManagePasskeys={false} passkeys={PASSKEYS} />,
        );

        expect(container).toBeEmptyDOMElement();
    });

    it('states plainly that no passkeys are registered', () => {
        render(<ManagePasskeys canManagePasskeys passkeys={[]} />);

        expect(
            screen.getByRole('heading', { name: 'No passkeys' }),
        ).toBeInTheDocument();
        expect(screen.queryByRole('list')).toBeNull();
    });

    it('lists every registered passkey', () => {
        render(<ManagePasskeys canManagePasskeys passkeys={PASSKEYS} />);

        const rows = within(screen.getByRole('list')).getAllByRole('listitem');

        expect(rows).toHaveLength(2);
        expect(rows[0]).toHaveTextContent('Chrome on Mac');
        expect(rows[1]).toHaveTextContent('iPhone');
    });

    it('drops the empty state once a passkey exists', () => {
        render(<ManagePasskeys canManagePasskeys passkeys={PASSKEYS} />);

        expect(
            screen.queryByRole('heading', { name: 'No passkeys' }),
        ).toBeNull();
    });

    it('always offers registration, empty or not', () => {
        const { rerender } = render(
            <ManagePasskeys canManagePasskeys passkeys={[]} />,
        );

        expect(screen.getByTestId('passkey-register')).toBeInTheDocument();

        rerender(<ManagePasskeys canManagePasskeys passkeys={PASSKEYS} />);

        expect(screen.getByTestId('passkey-register')).toBeInTheDocument();
    });
});
