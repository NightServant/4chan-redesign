import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShareControl } from '@/components/clover/share-control';

/** Mirrors `CONFIRMATION_MS` in the component, which is not exported. */
const CONFIRMATION_MS = 2000;

/**
 * `navigator.share` and `navigator.clipboard` do not exist in jsdom, and both
 * are non-configurable on some engines, so each test installs exactly the pair
 * it is describing and the original is restored afterwards.
 */
const original = {
    share: navigator.share,
    clipboard: navigator.clipboard,
};

function install(overrides: { share?: unknown; clipboard?: unknown }): void {
    Object.defineProperty(navigator, 'share', {
        value: overrides.share,
        configurable: true,
        writable: true,
    });
    Object.defineProperty(navigator, 'clipboard', {
        value: overrides.clipboard,
        configurable: true,
        writable: true,
    });
}

beforeEach(() => {
    vi.useRealTimers();
});

afterEach(() => {
    install(original);
    vi.restoreAllMocks();
});

describe('ShareControl', () => {
    it('prefers the platform share sheet when the browser has one', async () => {
        const share = vi.fn().mockResolvedValue(undefined);
        const writeText = vi.fn().mockResolvedValue(undefined);
        install({ share, clipboard: { writeText } });

        render(<ShareControl url="/g/58210441" title="A thread" />);

        await userEvent.click(screen.getByRole('button'));

        expect(share).toHaveBeenCalledWith({
            url: `${window.location.origin}/g/58210441`,
            title: 'A thread',
        });
        expect(writeText).not.toHaveBeenCalled();
    });

    it('falls back to the clipboard when there is no share sheet', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        install({ share: undefined, clipboard: { writeText } });

        render(<ShareControl url="/g/58210441" />);

        await userEvent.click(screen.getByRole('button'));

        expect(writeText).toHaveBeenCalledWith(
            `${window.location.origin}/g/58210441`,
        );
    });

    /**
     * Dismissing the share sheet rejects. An anon who closes it by accident
     * should still end up with the link rather than nothing at all, so the
     * rejection falls through to the clipboard instead of returning.
     */
    it('falls through to the clipboard when the share sheet is dismissed', async () => {
        const share = vi.fn().mockRejectedValue(new Error('AbortError'));
        const writeText = vi.fn().mockResolvedValue(undefined);
        install({ share, clipboard: { writeText } });

        render(<ShareControl url="/g/58210441" />);

        await userEvent.click(screen.getByRole('button'));

        await waitFor(() => expect(writeText).toHaveBeenCalled());
    });

    it('resolves a bare fragment against the page being read, not the origin', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        install({ share: undefined, clipboard: { writeText } });

        window.history.pushState({}, '', '/g/58210441');

        render(<ShareControl url="#p58210500" />);

        await userEvent.click(screen.getByRole('button'));

        expect(writeText).toHaveBeenCalledWith(
            `${window.location.origin}/g/58210441#p58210500`,
        );
    });

    it('confirms the copy in text rather than by colour alone', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        install({ share: undefined, clipboard: { writeText } });

        render(<ShareControl url="/g/58210441" />);

        expect(screen.getByRole('button')).toHaveTextContent('Share');

        await userEvent.click(screen.getByRole('button'));

        await waitFor(() =>
            expect(screen.getByRole('button')).toHaveTextContent('Link copied'),
        );
        expect(screen.getByRole('status')).toHaveTextContent(
            'Link copied to clipboard',
        );
    });

    /**
     * A denied clipboard copies nothing, so it must not claim it did. This is
     * the case that would otherwise tell an anon a link is on their clipboard
     * when it is not.
     */
    it('says nothing when the clipboard refuses', async () => {
        const writeText = vi.fn().mockRejectedValue(new Error('denied'));
        install({ share: undefined, clipboard: { writeText } });

        render(<ShareControl url="/g/58210441" />);

        await userEvent.click(screen.getByRole('button'));

        await waitFor(() => expect(writeText).toHaveBeenCalled());
        expect(screen.getByRole('button')).toHaveTextContent('Share');
        expect(screen.getByRole('button')).not.toHaveTextContent('Link copied');
    });

    it('names itself for a screen reader when the label is hidden', () => {
        install({ share: undefined, clipboard: undefined });

        render(<ShareControl url="/g/58210441" iconOnly />);

        expect(screen.getByRole('button')).toHaveAccessibleName('Share');
        expect(screen.getByRole('button')).not.toHaveTextContent('Share');
    });

    /**
     * The confirmation is on a timer, and a timer that outlives its component
     * sets state on something unmounted — and keeps the test runner alive
     * after the assertions finish, which has taken this suite red before.
     *
     * This identifies *our* timer by its delay and then asserts that exact id
     * was cleared. A plain `clearTimeout` spy passed with the cleanup deleted,
     * because `userEvent` sets and clears timers of its own and the spy could
     * not tell whose were whose. Fake timers deadlock instead: the component
     * awaits the clipboard promise, and `waitFor` cannot advance past it.
     */
    it('clears its own pending timer when unmounted', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        install({ share: undefined, clipboard: { writeText } });

        const ours: unknown[] = [];
        const realSetTimeout = globalThis.setTimeout;

        vi.spyOn(globalThis, 'setTimeout').mockImplementation(((
            handler: TimerHandler,
            delay?: number,
            ...rest: unknown[]
        ) => {
            const id = realSetTimeout(handler, delay, ...rest);

            if (delay === CONFIRMATION_MS) {
                ours.push(id);
            }

            return id;
        }) as typeof globalThis.setTimeout);

        const cleared = vi.spyOn(globalThis, 'clearTimeout');

        const { unmount } = render(<ShareControl url="/g/58210441" />);

        await userEvent.click(screen.getByRole('button'));
        await waitFor(() =>
            expect(screen.getByRole('button')).toHaveTextContent('Link copied'),
        );

        expect(ours).toHaveLength(1);

        unmount();

        expect(cleared).toHaveBeenCalledWith(ours[0]);
    });
});
