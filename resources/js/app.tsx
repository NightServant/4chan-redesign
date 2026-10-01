import { createInertiaApp, router } from '@inertiajs/react';
import { Analytics } from '@vercel/analytics/react';
import { useEffect, useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';

/**
 * Vercel Web Analytics counts page views with no cookies (see the privacy
 * page). The plain-React build of `@vercel/analytics` has no built-in SPA
 * route support the way the Next.js/Remix/Vue wrappers do — Vercel's own
 * quickstart says so explicitly for the `create-react-app` import this
 * project uses, and `node_modules/@vercel/analytics/dist/react/index.mjs`
 * confirms it: the injected script only fires an automatic pageview unless
 * `route`/`path` props are supplied, in which case it disables auto-track and
 * fires one pageview per prop change instead.
 *
 * Inertia never reloads the page, so left on auto-track the script would see
 * exactly one page view for the whole visit. `router.on('navigate', ...)`
 * fires after every completed Inertia visit, including client-side ones, so
 * feeding the new path through on that event is what makes each Inertia
 * navigation count as its own page view.
 */
function RouteAnalytics() {
    const [path, setPath] = useState(() => window.location.pathname);

    useEffect(
        () => router.on('navigate', () => setPath(window.location.pathname)),
        [],
    );

    return <Analytics route={path} path={path} />;
}

/**
 * `Laravel` was the fallback and, because `VITE_APP_NAME` was never set, it was
 * also the answer: every tab in the product read "… - Laravel".
 */
const appName = import.meta.env.VITE_APP_NAME || 'Clover';

createInertiaApp({
    /**
     * The page's own title, and nothing appended to it.
     *
     * It used to be `${title} - ${appName}`, which spent the readable half of
     * a tab on the site name — the same site name on every tab, in a browser
     * that truncates at about twenty characters. A page carrying a thread
     * title has more to say in that space than Clover does, and the pages that
     * want the name in the tab say it themselves.
     */
    title: (title) => title || appName,
    layout: (name) => {
        switch (true) {
            case name === 'welcome':
                return null;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
                <RouteAnalytics />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
