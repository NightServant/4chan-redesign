import type { MouseEventHandler, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * An activity or notification row: leading icon, title, meta timestamp.
 * A list row, not a card. Rows are separated with a hairline divider, and
 * are never individually bordered or nested inside another card.
 *
 * Unread state is never colour alone. The dot is paired with a
 * visually-hidden "Unread" string so it reaches assistive technology.
 */

type NotificationItemProps = {
    /** Icon slot, kept decorative; the row's own text carries the meaning. */
    leading: ReactNode;
    title: ReactNode;
    meta: ReactNode;
    unread?: boolean;
    /** Supplying href renders a real anchor. */
    href?: string;
    /** Supplying onClick without href renders a real button. */
    onClick?: MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;
    className?: string;
};

function NotificationItem({
    leading,
    title,
    meta,
    unread = false,
    href,
    onClick,
    className,
}: NotificationItemProps) {
    const interactive = Boolean(href || onClick);

    const rowClasses = cn(
        'flex w-full items-start gap-3 border-b border-border px-1 py-3 text-left last:border-b-0',
        interactive &&
            'transition-colors duration-[var(--duration-hover)] ease-standard hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        className,
    );

    const content = (
        <>
            <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center text-faint [&_svg]:size-4"
            >
                {leading}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-center gap-2">
                    <span className="truncate text-body-sm text-foreground">
                        {title}
                    </span>
                    {unread && (
                        <span className="flex shrink-0 items-center gap-1">
                            <span
                                aria-hidden="true"
                                className="size-1.5 rounded-full bg-primary"
                            />
                            <span className="sr-only">Unread</span>
                        </span>
                    )}
                </span>
                <span className="text-caption text-faint">{meta}</span>
            </span>
        </>
    );

    if (href) {
        return (
            <a
                data-slot="notification-item"
                href={href}
                className={rowClasses}
                onClick={onClick as MouseEventHandler<HTMLAnchorElement>}
            >
                {content}
            </a>
        );
    }

    if (onClick) {
        return (
            <button
                type="button"
                data-slot="notification-item"
                className={rowClasses}
                onClick={onClick as MouseEventHandler<HTMLButtonElement>}
            >
                {content}
            </button>
        );
    }

    return (
        <div data-slot="notification-item" className={rowClasses}>
            {content}
        </div>
    );
}

export { NotificationItem };
export type { NotificationItemProps };
