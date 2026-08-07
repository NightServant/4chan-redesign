import type { InertiaLinkProps } from '@inertiajs/react';
import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge only knows Tailwind's built-in scale, so Clover's type scale
 * (`text-body`, `text-caption`, `text-h1` ...) reads to it as a colour utility.
 * Left unconfigured it puts them in the same class group as `text-faint` and
 * silently drops whichever came first, deleting the font size with no error.
 * Registering them as font sizes is what keeps size and colour coexisting.
 */
const twMerge = extendTailwindMerge({
    extend: {
        classGroups: {
            'font-size': [
                {
                    text: [
                        'display',
                        'h1',
                        'h2',
                        'h3',
                        'body',
                        'body-sm',
                        'meta',
                        'caption',
                        'label',
                    ],
                },
            ],
        },
    },
});

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function toUrl(url: NonNullable<InertiaLinkProps['href']>): string {
    return typeof url === 'string' ? url : url.url;
}
