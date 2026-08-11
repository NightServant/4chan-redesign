import { Lock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import PasswordInput from '@/components/password-input';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Auth-screen text fields.
 *
 * Two things separate these from the plain `Input`: they are 44px rather than
 * 38px, and they sit on `bg-bg` rather than `bg-surface`. The card is already
 * `bg-surface`, so a field filled with the same token would read as a flat
 * region with a hairline drawn on it. Filling one step darker than the card is
 * what makes the field look recessed on a dark theme without a shadow, and it
 * is what the design does.
 *
 * The leading glyph is decorative. It restates the label, so exposing it would
 * make a screen reader announce the field twice.
 */
const AUTH_CONTROL = 'h-11 bg-bg pl-10';

const AUTH_ICON =
    'pointer-events-none absolute top-1/2 left-3.5 z-10 -translate-y-1/2 text-faint';

type AuthInputProps = ComponentProps<typeof Input> & {
    /** Leading glyph. Decorative, never the field's accessible name. */
    icon: LucideIcon;
};

function AuthInput({ icon: Icon, className, ...props }: AuthInputProps) {
    return (
        <div className="relative">
            <Icon
                data-slot="auth-input-icon"
                aria-hidden="true"
                size={16}
                className={AUTH_ICON}
            />
            <Input className={cn(AUTH_CONTROL, className)} {...props} />
        </div>
    );
}

type AuthPasswordInputProps = ComponentProps<typeof PasswordInput> & {
    /** Defaults to the padlock; every password field in the design uses it. */
    icon?: LucideIcon;
};

/**
 * `PasswordInput` already owns the show/hide toggle, the "Show password" /
 * "Hide password" label swap and the right-hand padding that keeps text clear
 * of it, so this only adds the leading glyph and the auth sizing.
 */
function AuthPasswordInput({
    icon: Icon = Lock,
    className,
    ...props
}: AuthPasswordInputProps) {
    return (
        <div className="relative">
            <Icon
                data-slot="auth-input-icon"
                aria-hidden="true"
                size={16}
                className={AUTH_ICON}
            />
            <PasswordInput className={cn(AUTH_CONTROL, className)} {...props} />
        </div>
    );
}

export { AuthInput, AuthPasswordInput };
export type { AuthInputProps, AuthPasswordInputProps };
