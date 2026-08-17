import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * A binary toggle: 40x22 track, 18px thumb, 200ms state transition.
 *
 * Built on a real `<input type="checkbox" role="switch">` rather than a
 * styled `<div>`, so it is focusable and toggles on Space with no extra
 * wiring. The visual track and thumb are decorative siblings driven by the
 * `peer` variant, and the input itself carries `aria-checked` explicitly so
 * assistive technology never has to infer switch state from the checkbox
 * role it is overriding.
 *
 * The thumb travels with `transform: translateX(...)`, never
 * `justify-content`: that is a layout property and animating it is banned.
 */
type SwitchProps = Omit<
    ComponentProps<'input'>,
    'type' | 'role' | 'size' | 'checked'
> & {
    checked: boolean;
    onCheckedChange?: (checked: boolean) => void;
    /** When present, wraps the control so the text is genuinely associated. */
    label?: ReactNode;
};

function Switch({
    checked,
    onCheckedChange,
    label,
    disabled,
    className,
    ...props
}: SwitchProps) {
    /* The hit area belongs to the label, not to the 22x40 track: a click
       anywhere in a label toggles the control it wraps, so this is already
       the surface a finger aims at, and growing it needs no second copy of
       the switch's own geometry. Since task 4 that matters on a phone --
       this switch is how the account screen reaches the adult-boards
       setting, which the task 5 report still describes as living in a
       dropdown. */
    return (
        <label
            className={cn(
                'touch-target-44 inline-flex items-center gap-2',
                disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                className,
            )}
        >
            <span className="relative inline-flex h-[22px] w-10 shrink-0 items-center">
                <input
                    type="checkbox"
                    role="switch"
                    aria-checked={checked}
                    checked={checked}
                    disabled={disabled}
                    onChange={(event) =>
                        onCheckedChange?.(event.target.checked)
                    }
                    className="peer absolute inset-0 z-10 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                    {...props}
                />
                <span
                    data-slot="switch-track"
                    aria-hidden="true"
                    className={cn(
                        'pointer-events-none absolute inset-0 rounded-full transition-colors duration-[var(--duration-state)] ease-standard',
                        checked
                            ? 'bg-primary'
                            : 'border border-border-strong bg-surface-hover',
                        'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring',
                    )}
                />
                <span
                    data-slot="switch-thumb"
                    aria-hidden="true"
                    className={cn(
                        'pointer-events-none relative size-[18px] rounded-full bg-current transition-transform duration-[var(--duration-state)] ease-standard',
                        checked
                            ? 'translate-x-[20px] text-primary-foreground'
                            : 'translate-x-0.5 text-faint',
                    )}
                />
            </span>
            {label ? (
                <span className="text-body-sm text-foreground">{label}</span>
            ) : null}
        </label>
    );
}

export { Switch };
export type { SwitchProps };
