import type { LucideIcon } from 'lucide-react';
import { Monitor, Moon, Sun } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import type { Appearance } from '@/hooks/use-appearance';
import { useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';

/**
 * The three theme choices. Not Radix `Tabs`: nothing here is a tab panel, and
 * roving focus would make the middle two unreachable by a single Tab press.
 * A group of toggle buttons reporting `aria-pressed` is what this actually is.
 *
 * The three values are the ones `useAppearance` writes to the `appearance`
 * cookie, which `HandleAppearance` reads server-side. Renaming or adding one
 * here without changing the middleware silently breaks the first paint.
 */
const tabs: { value: Appearance; icon: LucideIcon; label: string }[] = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
];

const tabBaseClasses =
    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-body-sm transition-colors duration-[var(--duration-hover)] ease-standard';

const tabRestClasses =
    'text-muted-foreground hover:bg-surface-hover hover:text-foreground';

const tabSelectedClasses = 'bg-primary-soft font-medium text-primary';

export default function AppearanceToggleTab({
    className = '',
    ...props
}: HTMLAttributes<HTMLDivElement>) {
    const { appearance, updateAppearance } = useAppearance();

    return (
        <div
            role="group"
            aria-label="Theme"
            className={cn(
                'inline-flex w-fit gap-1 rounded-lg border border-border bg-bg p-1',
                className,
            )}
            {...props}
        >
            {tabs.map(({ value, icon: Icon, label }) => {
                const selected = appearance === value;

                return (
                    <button
                        key={value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => updateAppearance(value)}
                        className={cn(
                            tabBaseClasses,
                            selected ? tabSelectedClasses : tabRestClasses,
                        )}
                    >
                        <Icon aria-hidden="true" className="size-4 shrink-0" />
                        {label}
                    </button>
                );
            })}
        </div>
    );
}
