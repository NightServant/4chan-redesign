import { AuthBrandPanel } from '@/components/auth/auth-brand-panel';
import { AuthCard } from '@/components/auth/auth-card';
import { PatternField } from '@/components/clover/pattern-field';
import type { AuthLayoutProps } from '@/types';

/**
 * Every auth screen: brand panel on the left, card on the right.
 *
 * The split collapses to the card alone below `lg`. The panel is hidden rather
 * than stacked because everything in it is supporting argument, and a phone
 * that has already tapped "sign in" does not need to be sold again before it
 * can reach the form.
 *
 * The form side is drawn on the same patterned paper as the rest of the site.
 * The brand panel is deliberately left flat: two patterned halves either side
 * of a hairline is one surface interrupted, and the point of the split is that
 * the two sides are different kinds of thing.
 */
export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="grid min-h-dvh grid-cols-1 bg-bg lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <AuthBrandPanel className="hidden lg:flex" />

            <main className="flex">
                {/* One rule for all seven screens, and it lives here rather
                    than on each page: `app.tsx` resolves every `auth/` page
                    through this layout, and four copies of a centring rule is
                    how they drifted into starting at four different heights.

                    Centred, not top-anchored. Top-anchored, `register` left
                    about 450px of empty paper below it on a desktop viewport
                    and read as a page that had not finished rendering.

                    The centring is a *minimum* height with the content free to
                    grow past it, plus vertical padding — never a fixed-height
                    box. A form taller than the viewport makes the box taller
                    and the centring a no-op, so nothing is ever pushed
                    off-screen: sign-in is the tallest of these and a phone in
                    landscape is about 400px tall. `min-h-dvh` and not `vh`,
                    because a mobile address bar makes `100vh` taller than the
                    visible viewport and would put that clipping straight back.

                    The padding steps down below `sm`. At 320px this side spent
                    64px a side and the card another 64px — 128px of chrome on a
                    320px viewport, which is 40% of the screen and the reason a
                    "Confirm password" placeholder had nowhere to set. */}
                <PatternField
                    depth={24}
                    feather={false}
                    className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8 sm:py-12"
                    contentClassName="w-full max-w-[420px]"
                >
                    <AuthCard title={title} description={description}>
                        {children}
                    </AuthCard>
                </PatternField>
            </main>
        </div>
    );
}
