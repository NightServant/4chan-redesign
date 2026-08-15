import { createInertiaApp } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';

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
            </TooltipProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
