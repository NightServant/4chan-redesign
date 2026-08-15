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

/**
 * `3 boards`, `1 board`. For the counts in page descriptions.
 *
 * Naive `-s` suffixing by default, which is all most of these need: the nouns
 * are ones Clover writes itself — board, saved thread — and a pluralisation
 * library for those would be a dependency bought to solve a problem the copy
 * does not have.
 *
 * `plural` is there because the naive rule is wrong the moment a noun does not
 * take a bare `-s`, and it fails silently when it is: the notifications screen
 * shipped `3 new replys` for exactly as long as it took to read one. A caller
 * whose noun is irregular passes the plural rather than working around this
 * function.
 */
export function plural(count: number, noun: string, plural?: string): string {
    if (count === 1) {
        return `${count} ${noun}`;
    }

    return `${count} ${plural ?? `${noun}s`}`;
}
