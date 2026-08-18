import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppearance } from '@/hooks/use-appearance';
import type { Appearance } from '@/hooks/use-appearance';

/**
 * The theme control, on the account screen below `md`.
 *
 * It used to be the third icon in the mobile header, and it was the weakest
 * claim on that row: a hamburger and a search bar are how an anon moves
 * through the app, and a theme is something they set once. Gabe's decision,
 * 2026-08-17 — it moves here, the header below `md` becomes hamburger and
 * search, and the search bar takes the width the toggle was holding. At `md`
 * and up the header keeps its toggle and this row does not render.
 *
 * Three options rather than two, because the hook has always had three:
 * `system` is what an anon gets before they choose, and a two-state toggle
 * could set light or dark but never give it back.
 *
 * The trigger reads as the current value rather than as the control's name,
 * matching the sort and time menus on the search results page.
 */
const OPTIONS: readonly { value: Appearance; label: string }[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
];

const ICONS: Record<Appearance, typeof SunIcon> = {
    light: SunIcon,
    dark: MoonIcon,
    system: MonitorIcon,
};

function AppearanceRow() {
    const { appearance, updateAppearance } = useAppearance();

    const Icon = ICONS[appearance];
    const current =
        OPTIONS.find((option) => option.value === appearance)?.label ??
        'System';

    return (
        <div className="flex items-center gap-3 border-b border-border px-1 py-4">
            <Icon
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground"
            />

            <span className="min-w-0 flex-1 truncate text-body-sm text-foreground">
                Appearance
            </span>

            <DropdownMenu>
                <DropdownMenuTrigger className="touch-target-44 flex shrink-0 items-center gap-1 text-body-sm text-muted-foreground">
                    {current}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {OPTIONS.map((option) => (
                        <DropdownMenuItem
                            key={option.value}
                            onSelect={() => updateAppearance(option.value)}
                        >
                            {option.label}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

export { AppearanceRow };
