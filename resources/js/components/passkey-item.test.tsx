import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PasskeyItem from '@/components/passkey-item';
import type { Passkey } from '@/types/auth';

const PASSKEY: Passkey = {
    id: 7,
    name: 'Chrome on Mac',
    authenticator: 'iCloud Keychain',
    created_at_diff: '2 days ago',
    last_used_at_diff: '1 hour ago',
};

const onDelete = vi.fn();

/** The row is an `li`, so it needs a list to be a valid child of. */
function renderRow(passkey: Passkey = PASSKEY) {
    return render(
        <ul>
            <PasskeyItem passkey={passkey} onDelete={onDelete} />
        </ul>,
    );
}

beforeEach(() => {
    onDelete.mockReset();
});

describe('PasskeyItem', () => {
    it('renders as a list item', () => {
        renderRow();

        expect(screen.getByRole('listitem')).toBeInTheDocument();
    });

    it('names the passkey and its authenticator', () => {
        renderRow();

        expect(screen.getByText('Chrome on Mac')).toBeInTheDocument();
        expect(screen.getByText('iCloud Keychain')).toBeInTheDocument();
    });

    it('reports when it was added and last used', () => {
        renderRow();

        const row = screen.getByRole('listitem');

        expect(row).toHaveTextContent('Added 2 days ago');
        expect(row).toHaveTextContent('Last used 1 hour ago');
    });

    it('omits the last-used reading when the passkey has never been used', () => {
        renderRow({ ...PASSKEY, last_used_at_diff: null, authenticator: null });

        expect(screen.getByRole('listitem')).not.toHaveTextContent('Last used');
        expect(screen.queryByText('iCloud Keychain')).toBeNull();
    });

    it('names the remove control after the passkey it removes', () => {
        renderRow();

        expect(
            screen.getByRole('button', { name: 'Remove Chrome on Mac' }),
        ).toBeInTheDocument();
    });

    it('confirms before removing', async () => {
        const user = userEvent.setup();

        renderRow();

        await user.click(
            screen.getByRole('button', { name: 'Remove Chrome on Mac' }),
        );

        expect(onDelete).not.toHaveBeenCalled();
        expect(
            screen.getByRole('heading', { name: 'Remove passkey' }),
        ).toBeInTheDocument();

        await user.click(
            screen.getByRole('button', { name: 'Remove passkey' }),
        );

        expect(onDelete).toHaveBeenCalledWith(7, expect.any(Function));
    });

    it('leaves the passkey alone when the anon backs out', async () => {
        const user = userEvent.setup();

        renderRow();

        await user.click(
            screen.getByRole('button', { name: 'Remove Chrome on Mac' }),
        );
        await user.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(onDelete).not.toHaveBeenCalled();
    });

    it('re-enables the confirm control when the removal fails', async () => {
        const user = userEvent.setup();

        onDelete.mockImplementation((_id: number, onError: () => void) =>
            onError(),
        );

        renderRow();

        await user.click(
            screen.getByRole('button', { name: 'Remove Chrome on Mac' }),
        );
        await user.click(
            screen.getByRole('button', { name: 'Remove passkey' }),
        );

        expect(
            screen.getByRole('button', { name: 'Remove passkey' }),
        ).toBeEnabled();
    });
});
