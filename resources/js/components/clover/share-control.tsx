import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import { Check, Share2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/**
 * Sending a thread to somebody who is not here.
 *
 * This replaced blessings and curses, and it is a different kind of thing on
 * purpose. A blessing was a number this site kept about itself; a share leaves
 * the site entirely and Clover records nothing when one happens. There is no
 * route behind this button and no row written — the URL it copies is a page
 * that already exists.
 *
 * Two mechanisms, in order of preference. `navigator.share` opens the
 * platform's own sheet, which is what an anon on a phone expects and the only
 * way to reach the applications they actually send links with. It does not
 * exist on most desktop browsers, so the clipboard is the fallback rather than
 * the other way around.
 */
const shareButtonVariants = cva(
    [
        'touch-target-44 inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md text-muted-foreground',
        'transition-colors duration-[var(--duration-hover)] ease-standard',
        'hover:bg-surface-hover hover:text-foreground active:scale-[0.98]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    ],
    {
        variants: {
            size: {
                sm: "h-7 px-2 text-caption [&_svg:not([class*='size-'])]:size-3.5",
                md: "h-8.5 px-2.5 text-body-sm [&_svg:not([class*='size-'])]:size-4",
            },
        },
        defaultVariants: {
            size: 'md',
        },
    },
);

/** How long the button admits it copied something, in milliseconds. */
const CONFIRMATION_MS = 2000;

type ShareControlProps = Omit<
    ComponentProps<'button'>,
    'children' | 'onClick'
> &
    VariantProps<typeof shareButtonVariants> & {
        /**
         * Where the share points. Resolved against the page being read, because
         * a bare `/g/12345` is useless to whoever receives it.
         */
        url: string;
        /** Used by the platform share sheet. Ignored by the clipboard path. */
        title?: string;
        /** Hides the word next to the icon, for rows already dense with them. */
        iconOnly?: boolean;
    };

/**
 * Resolve against the page being read, and leave an already-absolute URL alone.
 *
 * The base is the current href rather than the origin so that a bare fragment
 * resolves to *this* page — a comment shares as `#p12345` and has to arrive as
 * the thread it sits on. An absolute path is unaffected either way.
 *
 * `new URL` throws on input it cannot parse rather than returning something
 * broken, so a bad path fails here instead of being sent to somebody.
 */
function absoluteUrl(url: string): string {
    if (typeof window === 'undefined') {
        return url;
    }

    return new URL(url, window.location.href).toString();
}

function ShareControl({
    url,
    title,
    iconOnly = false,
    size = 'md',
    className,
    ...props
}: ShareControlProps) {
    const [copied, setCopied] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    /**
     * A pending timer outlives the component that set it. Left uncleared it
     * calls `setState` on something unmounted, and in the test environment it
     * keeps the run alive after the assertions have finished — which has taken
     * this suite red before.
     */
    useEffect(
        () => () => {
            if (timer.current !== null) {
                clearTimeout(timer.current);
            }
        },
        [],
    );

    const confirm = useCallback(() => {
        setCopied(true);

        if (timer.current !== null) {
            clearTimeout(timer.current);
        }

        timer.current = setTimeout(() => setCopied(false), CONFIRMATION_MS);
    }, []);

    const share = useCallback(async () => {
        const target = absoluteUrl(url);

        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share({ url: target, title });

                return;
            } catch {
                /**
                 * Dismissing the share sheet rejects, and so does a platform
                 * that advertises the API and then refuses the call. Neither is
                 * worth an error message, and both should still leave the anon
                 * with a way to get the link, so this falls through to the
                 * clipboard rather than returning.
                 */
            }
        }

        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(target);
                confirm();
            } catch {
                /** Denied clipboard permission. Nothing was copied, so say nothing. */
            }
        }
    }, [confirm, title, url]);

    const label = copied ? 'Link copied' : 'Share';

    return (
        <button
            type="button"
            data-slot="share-control"
            aria-label={iconOnly ? label : undefined}
            onClick={() => {
                void share();
            }}
            className={cn(shareButtonVariants({ size }), className)}
            {...props}
        >
            {copied ? (
                <Check aria-hidden="true" className="text-primary" />
            ) : (
                <Share2 aria-hidden="true" />
            )}
            {iconOnly ? null : <span>{label}</span>}

            {/* The icon swap is invisible to a screen reader and `aria-label`
                on a button is not reliably re-announced when it changes, so the
                confirmation gets its own live region. Empty until there is
                something to say, so it announces once rather than on mount. */}
            <span className="sr-only" role="status">
                {copied ? 'Link copied to clipboard' : ''}
            </span>
        </button>
    );
}

export { ShareControl, shareButtonVariants };
export type { ShareControlProps };
