import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuthSplitLayout from '@/layouts/auth/auth-split-layout';

/* `AuthCard` reads the shared auth prop to decide whether its wordmark is a
   way out to the marketing homepage -- signed in, it must not be. Real
   Inertia always provides `usePage`; a double that omits it only proves the
   component cannot be rendered. */
const { usePage } = vi.hoisted(() => ({ usePage: vi.fn() }));

vi.mock('@inertiajs/react', () => ({
    usePage,
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
}));

beforeEach(() => {
    usePage.mockReturnValue({ props: { auth: { user: null } } });
});

describe('AuthSplitLayout', () => {
    it('renders the page title as the only first-level heading', () => {
        render(
            <AuthSplitLayout
                title="Welcome back"
                description="Sign in to continue your Clover experience."
            >
                <p>form</p>
            </AuthSplitLayout>,
        );

        const headings = screen.getAllByRole('heading', { level: 1 });

        expect(headings).toHaveLength(1);
        expect(headings[0]).toHaveTextContent('Welcome back');
    });

    it('puts the form inside the main landmark', () => {
        render(
            <AuthSplitLayout title="Welcome back">
                <button type="button">Sign in</button>
            </AuthSplitLayout>,
        );

        expect(
            within(screen.getByRole('main')).getByRole('button', {
                name: 'Sign in',
            }),
        ).toBeInTheDocument();
    });

    it('keeps the brand panel beside the card', () => {
        render(
            <AuthSplitLayout title="Welcome back">
                <p>form</p>
            </AuthSplitLayout>,
        );

        expect(screen.getByText('Anonymous by default')).toBeInTheDocument();
    });

    /**
     * Task 13, fix 2. Every auth screen resolves through this one layout
     * (`app.tsx` hands `AuthLayout` to any page under `auth/`), so this is one
     * rule rather than seven copies of one — which is how the four screens
     * drifted into starting at four different heights in the first place.
     *
     * Centred, not top-anchored. Anchored to the top, `register` left roughly
     * 450px of empty paper below it on a desktop viewport and read as a page
     * that had failed to finish rendering.
     *
     * The centring is `min-h-dvh` with the content free to grow past it, plus
     * vertical padding — not a fixed-height box. `min-height` means a form
     * taller than the viewport simply makes the box taller and the centring a
     * no-op, so nothing is ever pushed off-screen: sign-in is the tallest of
     * these (passkey button, divider, two fields, remember-me, forgot link,
     * submit, footer) and a phone in landscape is about 400px tall. `dvh`
     * rather than `vh`, because a mobile address bar makes `100vh` taller than
     * the visible viewport and would put the clipping straight back.
     */
    it('centres the card vertically without letting a tall form clip', () => {
        const { container } = render(
            <AuthSplitLayout title="Welcome back">
                <p>form</p>
            </AuthSplitLayout>,
        );

        /* `PatternField` takes no arbitrary props, so its own slot is the
           handle: it is the element the layout's className lands on. */
        const field = container.querySelector<HTMLElement>(
            'main [data-slot="pattern-field"]',
        );

        expect(field?.className).toMatch(/(^|\s)items-center(\s|$)/);
        expect(field?.className).not.toMatch(/(^|\s)items-start(\s|$)/);
        expect(field?.className).toMatch(/(^|\s)py-10(\s|$)/);

        /* The height the centring is measured against, and the reason a tall
           form grows the box instead of overflowing it. */
        const page = container.firstElementChild;

        expect(page?.className).toMatch(/(^|\s)min-h-dvh(\s|$)/);
        expect(page?.className).not.toMatch(/(^|\s)h-dvh(\s|$)/);
        expect(page?.className).not.toMatch(/vh\b(?<!dvh)/);
    });

    /**
     * At 320px the form side spent 64px a side on padding and the card another
     * 64px, which is 128px of chrome on a 320px viewport — 40% of the screen,
     * and the reason a "Confirm password" placeholder had nowhere to set. Both
     * step down below `sm` and back up above it.
     */
    it('spends less of a narrow viewport on its own padding', () => {
        const { container } = render(
            <AuthSplitLayout title="Welcome back">
                <p>form</p>
            </AuthSplitLayout>,
        );

        /* `PatternField` takes no arbitrary props, so its own slot is the
           handle: it is the element the layout's className lands on. */
        const field = container.querySelector<HTMLElement>(
            'main [data-slot="pattern-field"]',
        );

        expect(field?.className).toMatch(/(^|\s)px-4(\s|$)/);
        expect(field?.className).toMatch(/(^|\s)sm:px-8(\s|$)/);
        expect(field?.className).not.toMatch(/(^|\s)px-8(\s|$)/);
    });

    /**
     * Task 13, fix 2, and the item's original point: one spacing rhythm across
     * the auth screens, and it is the settings forms' rhythm rather than a
     * third system invented for these pages.
     *
     * `settings/index.tsx` sets every form as `flex flex-col gap-5` with the
     * `FormField`s, the submit and anything else as direct children. The auth
     * pages ran `gap-6` and then wrapped their fields in an inner `gap-4` box
     * on three of the seven and not on the other four, so field-to-field
     * spacing was 16px on some screens and 24px on others while the settings
     * screen next door used 20px.
     *
     * The label/input/error rhythm inside a field was already shared: it comes
     * from `FormField`, which both surfaces use. This is the gap between
     * fields, which did not.
     *
     * A source scan, because `css: false` means no rendered test can measure a
     * gap and each page's `Form` is a mock in its own suite. It reads the
     * files this claim is actually about rather than a component that stands
     * in for them.
     */
    it('sets every auth form on the settings rhythm', async () => {
        const { readFileSync, readdirSync } = await import('node:fs');
        const { join } = await import('node:path');

        const directory = join(process.cwd(), 'resources/js/pages/auth');
        const pages = readdirSync(directory).filter(
            (entry) => entry.endsWith('.tsx') && !entry.endsWith('.test.tsx'),
        );

        expect(pages.length).toBeGreaterThan(0);

        for (const page of pages) {
            const source = readFileSync(join(directory, page), 'utf8');

            /* Every form on the settings rhythm. */
            expect(source).toMatch(/className="flex flex-col gap-5"/);
            /* And no second rhythm underneath it. */
            expect(source).not.toMatch(/className="flex flex-col gap-6"/);
            expect(source).not.toMatch(/className="flex flex-col gap-4"/);
        }
    });

    /**
     * The starter kit shipped `bg-zinc-900`, `text-white` and `text-black`
     * here, which is the whole reason this file was rewritten. A grep is
     * blunt, but `css: false` means no rendered test can see a colour.
     */
    it('leaves no raw Tailwind palette colour in the auth chrome', async () => {
        const { readFileSync } = await import('node:fs');
        const { join } = await import('node:path');

        const sources = [
            'resources/js/layouts/auth/auth-split-layout.tsx',
            'resources/js/layouts/auth-layout.tsx',
            'resources/js/components/auth/auth-brand-panel.tsx',
            'resources/js/components/auth/auth-card.tsx',
            'resources/js/components/auth/auth-input.tsx',
            'resources/js/components/auth/auth-link.tsx',
        ]
            .map((path) => readFileSync(join(process.cwd(), path), 'utf8'))
            // Comments legitimately name the classes they replaced.
            .map((source) =>
                source
                    .replace(/\/\*[\s\S]*?\*\//g, '')
                    .replace(/^\s*\/\/.*$/gm, ''),
            );

        const rawPalette =
            /\b(?:bg|text|border|decoration|ring|outline|fill)-(?:zinc|neutral|slate|gray|stone|red|green|blue|amber|yellow|emerald|white|black)\b/;

        for (const source of sources) {
            expect(source).not.toMatch(rawPalette);
        }
    });
});
