import { ChevronDownIcon } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/**
 * One of the search page's two filter menus: sort, and time.
 *
 * The trigger reads as the **current value** — "Relevance", "All time" — not
 * as the control's name, which is what the reference does and what leaves the
 * row legible on a phone. The name is still there for anyone who cannot see
 * the row it sits in: it is the trigger's accessible name, so a screen reader
 * announces "Sort by, Relevance" rather than an unattributed word.
 *
 * Radio items rather than plain ones, because exactly one is in force and the
 * menu should say which. Radix supplies the roving focus, the Escape handling
 * and `aria-checked`; what this adds is the Clover look — text and a chevron,
 * no bordered button, no pill.
 *
 * Generic over the value so the two callers keep their own union types and a
 * sort cannot be handed to the time menu.
 */
type SearchFilterMenuProps<T extends string> = {
    /** The accessible name, e.g. `Sort by`. Never rendered as text. */
    name: string;
    value: T;
    options: readonly { value: T; label: string }[];
    onSelect: (value: T) => void;
    className?: string;
};

function SearchFilterMenu<T extends string>({
    name,
    value,
    options,
    onSelect,
    className,
}: SearchFilterMenuProps<T>) {
    const current = options.find((option) => option.value === value);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                aria-label={name}
                data-slot="search-filter-menu"
                className={cn(
                    'touch-target-44 inline-flex items-center gap-1 rounded-md py-1 pr-1 text-body-sm font-medium text-muted-foreground',
                    'transition-colors duration-[var(--duration-hover)] ease-standard hover:text-foreground',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    className,
                )}
            >
                {current?.label ?? name}
                <ChevronDownIcon aria-hidden="true" className="size-3.5" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start">
                <DropdownMenuRadioGroup
                    value={value}
                    /* Radix hands back a bare string; the options are the only
                       values this group can emit, so it is narrowed against
                       them rather than asserted. */
                    onValueChange={(chosen) => {
                        const option = options.find(
                            (candidate) => candidate.value === chosen,
                        );

                        if (option !== undefined && option.value !== value) {
                            onSelect(option.value);
                        }
                    }}
                >
                    {options.map((option) => (
                        <DropdownMenuRadioItem
                            key={option.value}
                            value={option.value}
                        >
                            {option.label}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export { SearchFilterMenu };
export type { SearchFilterMenuProps };
