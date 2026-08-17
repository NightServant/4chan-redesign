import { Lock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import PasswordInput from '@/components/password-input';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';
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
 *
 * ## `shortPlaceholder`
 *
 * At 320px the auth card leaves a password field about 112px of room for its
 * placeholder, and a browser clips a placeholder with no ellipsis: sign-in
 * showed `email@example.con` with the last character cut, and register showed
 * `Confirm passw`. A control that reads as broken rather than as truncated.
 *
 * Shortened below `md`, not shrunk. Every text control in this application
 * steps up to 16px below `md` precisely so iOS does not zoom the viewport on
 * focus (see `ui/mobile-text-size.test.tsx`), so bringing the type size down
 * here would trade one bug for that one. An ellipsis was ruled out too: it
 * disguises the clipping rather than removing it.
 *
 * Swapped in JavaScript rather than with a CSS ghost span. `SearchField` wore
 * a `before:content-['Search'] md:before:content-[...]` overlay for exactly
 * this and it was removed, because a thing that looks like a placeholder and
 * is not one is worse than a long one.
 *
 * Optional, and omitting it is the right answer for a placeholder that already
 * fits: `Password` is eight characters and needs no second copy of itself.
 */

/** The placeholder to render at this width. See the docblock above. */
function usePlaceholder(
    placeholder: string | undefined,
    shortPlaceholder: string | undefined,
): string | undefined {
    const isMobile = useIsMobile();

    return isMobile && shortPlaceholder !== undefined
        ? shortPlaceholder
        : placeholder;
}
const AUTH_CONTROL = 'h-11 bg-bg pl-10';

const AUTH_ICON =
    'pointer-events-none absolute top-1/2 left-3.5 z-10 -translate-y-1/2 text-faint';

type AuthInputProps = ComponentProps<typeof Input> & {
    /** Leading glyph. Decorative, never the field's accessible name. */
    icon: LucideIcon;
    /** Stands in for `placeholder` below `md`. See the docblock above. */
    shortPlaceholder?: string;
};

function AuthInput({
    icon: Icon,
    className,
    placeholder,
    shortPlaceholder,
    ...props
}: AuthInputProps) {
    return (
        <div className="relative">
            <Icon
                data-slot="auth-input-icon"
                aria-hidden="true"
                size={16}
                className={AUTH_ICON}
            />
            <Input
                className={cn(AUTH_CONTROL, className)}
                placeholder={usePlaceholder(placeholder, shortPlaceholder)}
                {...props}
            />
        </div>
    );
}

type AuthPasswordInputProps = ComponentProps<typeof PasswordInput> & {
    /** Defaults to the padlock; every password field in the design uses it. */
    icon?: LucideIcon;
    /** Stands in for `placeholder` below `md`. See the docblock above. */
    shortPlaceholder?: string;
};

/**
 * `PasswordInput` already owns the show/hide toggle, the "Show password" /
 * "Hide password" label swap and the right-hand padding that keeps text clear
 * of it, so this only adds the leading glyph and the auth sizing.
 */
function AuthPasswordInput({
    icon: Icon = Lock,
    className,
    placeholder,
    shortPlaceholder,
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
            <PasswordInput
                className={cn(AUTH_CONTROL, className)}
                placeholder={usePlaceholder(placeholder, shortPlaceholder)}
                {...props}
            />
        </div>
    );
}

export { AuthInput, AuthPasswordInput };
export type { AuthInputProps, AuthPasswordInputProps };
