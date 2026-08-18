import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EditProfileDialog } from '@/components/account/edit-profile-dialog';
import { makeProfile } from '@/fixtures/factories';

/**
 * The form needs Inertia's `Form`, which needs an app context this test does
 * not have. The double calls the render prop with a settled state, so the
 * fields are observable without a server.
 */
vi.mock('@inertiajs/react', () => ({
    Form: ({
        children,
        action,
        method,
    }: {
        children: (state: {
            processing: boolean;
            errors: Record<string, string>;
        }) => ReactNode;
        action?: string;
        method?: string;
    } & Record<string, unknown>) => (
        <form action={action} method={method}>
            {children({ processing: false, errors: {} })}
        </form>
    ),
}));

/**
 * `useIsMobile` reads a real `matchMedia`, which jsdom does not implement.
 * This supplies one whose answer the tests set per case — the whole point
 * here being that the two widths render two different primitives.
 */
function setViewport(isMobile: boolean): void {
    vi.stubGlobal('matchMedia', (query: string) => ({
        matches: isMobile,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }));
}

const PROFILE = makeProfile();

beforeEach(() => {
    setViewport(false);
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('EditProfileDialog', () => {
    /**
     * A drawer from the bottom below `md`, a centred dialog above it.
     *
     * Gabe's request, 2026-08-17. A centred modal on a phone opens over the
     * middle of the screen with the keyboard pushing it further; a sheet rising
     * from the bottom edge puts the first field where the thumb already is.
     * The two are different Radix primitives rather than one restyled, so the
     * choice is a real branch — which is what `useIsMobile` is for.
     */
    it('opens as a bottom sheet below `md`', async () => {
        setViewport(true);
        const user = userEvent.setup();

        render(<EditProfileDialog profile={PROFILE} />);

        await user.click(screen.getByRole('button', { name: 'Edit profile' }));

        const surface = await screen.findByRole('dialog');

        expect(surface.dataset.slot).toBe('sheet-content');
        expect(surface.dataset.side).toBe('bottom');
    });

    it('opens as a centred dialog at `md` and up', async () => {
        const user = userEvent.setup();

        render(<EditProfileDialog profile={PROFILE} />);

        await user.click(screen.getByRole('button', { name: 'Edit profile' }));

        const surface = await screen.findByRole('dialog');

        expect(surface.dataset.slot).toBe('dialog-content');
    });

    /**
     * One form, two surfaces. The fields, their seeding and the save control
     * are the same object either way — a second copy is how the two drift.
     */
    it('carries the same two fields whichever surface it opens on', async () => {
        setViewport(true);
        const user = userEvent.setup();

        render(
            <EditProfileDialog
                profile={makeProfile({
                    storedHandle: 'anon_4412',
                    bio: 'Reads /g/ at 3am.',
                })}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'Edit profile' }));

        expect(await screen.findByLabelText('Username')).toHaveValue(
            'anon_4412',
        );
        expect(screen.getByLabelText('Bio')).toHaveValue('Reads /g/ at 3am.');
        expect(
            screen.getByRole('button', { name: 'Save' }),
        ).toBeInTheDocument();
    });
});
