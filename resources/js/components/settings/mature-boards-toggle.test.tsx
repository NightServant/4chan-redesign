import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MatureBoardsToggle } from '@/components/settings/mature-boards-toggle';

const { patch, pageProps } = vi.hoisted(() => ({
    patch: vi.fn(),
    pageProps: { showsMatureBoards: false },
}));

vi.mock('@inertiajs/react', () => ({
    router: { patch },
    usePage: () => ({ props: pageProps }),
}));

describe('MatureBoardsToggle', () => {
    beforeEach(() => {
        patch.mockReset();
        pageProps.showsMatureBoards = false;
    });

    it('reflects the preference the anon currently holds', () => {
        pageProps.showsMatureBoards = true;
        render(<MatureBoardsToggle />);

        expect(
            screen.getByRole('switch', { name: 'Show adult boards' }),
        ).toBeChecked();
    });

    it('is off when they have not opted in', () => {
        render(<MatureBoardsToggle />);

        expect(
            screen.getByRole('switch', { name: 'Show adult boards' }),
        ).not.toBeChecked();
    });

    it('saves on flip rather than waiting for a Save button', async () => {
        const user = userEvent.setup();
        render(<MatureBoardsToggle />);

        await user.click(
            screen.getByRole('switch', { name: 'Show adult boards' }),
        );

        expect(patch).toHaveBeenCalledTimes(1);
        expect(patch.mock.calls[0]?.[1]).toEqual({ shows_mature_boards: true });
    });

    it('can be operated from the keyboard', async () => {
        const user = userEvent.setup();
        render(<MatureBoardsToggle />);

        screen.getByRole('switch', { name: 'Show adult boards' }).focus();
        await user.keyboard(' ');

        expect(patch).toHaveBeenCalledTimes(1);
    });

    /**
     * The control must not sit showing the new value after the write failed.
     * An anon who thinks they opted out, and did not, is the one outcome this
     * setting cannot get wrong.
     */
    it('rolls back when the request fails', async () => {
        const user = userEvent.setup();
        patch.mockImplementation((_url, _data, options) => {
            options.onError();
            options.onFinish();
        });

        render(<MatureBoardsToggle />);
        const toggle = screen.getByRole('switch', {
            name: 'Show adult boards',
        });

        await user.click(toggle);

        expect(toggle).not.toBeChecked();
    });

    it('keeps the new value when the request succeeds', async () => {
        const user = userEvent.setup();
        patch.mockImplementation((_url, _data, options) => options.onFinish());

        render(<MatureBoardsToggle />);
        const toggle = screen.getByRole('switch', {
            name: 'Show adult boards',
        });

        await user.click(toggle);

        expect(toggle).toBeChecked();
    });
});
