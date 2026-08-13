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
                <PatternField
                    depth={24}
                    feather={false}
                    className="flex flex-1 items-center justify-center px-8 py-12"
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
