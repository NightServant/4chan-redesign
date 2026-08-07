import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import { Toaster as Sonner } from 'sonner';
import type { ToasterProps } from 'sonner';
import { useAppearance } from '@/hooks/use-appearance';
import { useFlashToast } from '@/hooks/use-flash-toast';

/**
 * Same icon and colour pairing as `clover/toast.tsx`, so a flash toast reads
 * consistently with the presentational row.
 */
const toneIcons = {
    success: <CircleCheck aria-hidden="true" className="size-4 text-success" />,
    error: <CircleAlert aria-hidden="true" className="size-4 text-danger" />,
    warning: (
        <TriangleAlert aria-hidden="true" className="size-4 text-warning" />
    ),
    info: <Info aria-hidden="true" className="size-4 text-accent-text" />,
};

function Toaster({ ...props }: ToasterProps) {
    /**
     * `resolvedAppearance` rather than `appearance` itself: Clover defaults
     * to dark rather than the OS preference, and sonner's own 'system' theme
     * would resolve independently of that default and could briefly diverge
     * from it.
     */
    const { resolvedAppearance } = useAppearance();

    useFlashToast();

    return (
        <Sonner
            theme={resolvedAppearance}
            className="toaster group"
            position="bottom-right"
            icons={toneIcons}
            toastOptions={{
                classNames: {
                    toast: 'shadow-overlay',
                },
            }}
            style={
                {
                    '--normal-bg': 'var(--surface-elevated)',
                    '--normal-border': 'var(--border-hairline)',
                    '--normal-text': 'var(--text-primary)',
                    '--success-bg': 'var(--surface-elevated)',
                    '--success-border': 'var(--border-hairline)',
                    '--success-text': 'var(--text-primary)',
                    '--error-bg': 'var(--surface-elevated)',
                    '--error-border': 'var(--border-hairline)',
                    '--error-text': 'var(--text-primary)',
                    '--warning-bg': 'var(--surface-elevated)',
                    '--warning-border': 'var(--border-hairline)',
                    '--warning-text': 'var(--text-primary)',
                    '--info-bg': 'var(--surface-elevated)',
                    '--info-border': 'var(--border-hairline)',
                    '--info-text': 'var(--text-primary)',
                    '--border-radius': 'var(--radius-xl)',
                } as React.CSSProperties
            }
            {...props}
        />
    );
}

export { Toaster };
