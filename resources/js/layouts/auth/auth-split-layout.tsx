import { AuthBrandPanel } from '@/components/auth/auth-brand-panel';
import { AuthCard } from '@/components/auth/auth-card';
import type { AuthLayoutProps } from '@/types';

/**
 * Every auth screen: brand panel on the left, card on the right.
 *
 * The split collapses to the card alone below `lg`. The panel is hidden rather
 * than stacked because everything in it is supporting argument, and a phone
 * that has already tapped "sign in" does not need to be sold again before it
 * can reach the form.
 */
export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="grid min-h-dvh grid-cols-1 bg-bg lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <AuthBrandPanel className="hidden lg:flex" />

            <main className="flex items-center justify-center px-8 py-12">
                <AuthCard title={title} description={description}>
                    {children}
                </AuthCard>
            </main>
        </div>
    );
}
