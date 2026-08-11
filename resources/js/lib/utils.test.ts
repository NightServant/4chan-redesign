import { describe, expect, it } from 'vitest';
import { cn, plural, toUrl } from '@/lib/utils';

describe('cn', () => {
    /**
     * tailwind-merge only knows Tailwind's built-in scale. Clover's type scale
     * (text-caption, text-body, text-h1 ...) looks like a colour utility to it,
     * so an unconfigured twMerge treats `text-caption` and `text-muted-foreground`
     * as the same class group and silently drops the size.
     */
    it.each([
        ['text-display', 'text-muted-foreground'],
        ['text-h1', 'text-primary'],
        ['text-h2', 'text-faint'],
        ['text-h3', 'text-foreground'],
        ['text-body', 'text-faint'],
        ['text-body-sm', 'text-muted-foreground'],
        ['text-meta', 'text-faint'],
        ['text-caption', 'text-muted-foreground'],
        ['text-label', 'text-faint'],
    ])('keeps the %s size alongside %s', (size, colour) => {
        const result = cn(size, colour);

        expect(result).toContain(size);
        expect(result).toContain(colour);
    });

    it('still lets a later Clover size override an earlier one', () => {
        expect(cn('text-body', 'text-caption')).toBe('text-caption');
    });

    it('still collapses conflicting built-in sizes', () => {
        expect(cn('text-sm', 'text-lg')).toBe('text-lg');
    });

    it('lets a Clover size override a built-in size', () => {
        expect(cn('text-sm', 'text-h1')).toBe('text-h1');
    });

    it('still collapses two competing colours', () => {
        expect(cn('text-faint', 'text-foreground')).toBe('text-foreground');
    });

    /**
     * `Button` and `Badge` used to concatenate their own type scale outside
     * this merge, from back when it would have been dropped. That emitted two
     * font-size utilities on one element and left the winner to stylesheet
     * order. They merge it now, which only works because the cases above do.
     */
    it('preserves argument order so a component default can be overridden', () => {
        expect(cn('text-body-sm font-medium', 'text-h3')).toBe(
            'font-medium text-h3',
        );
    });
});

describe('plural', () => {
    it('pluralises everything except one', () => {
        expect(plural(0, 'board')).toBe('0 boards');
        expect(plural(1, 'board')).toBe('1 board');
        expect(plural(2, 'board')).toBe('2 boards');
    });

    it('handles the multi-word nouns the page descriptions use', () => {
        expect(plural(1, 'saved thread')).toBe('1 saved thread');
        expect(plural(4, 'saved thread')).toBe('4 saved threads');
    });
});

describe('toUrl', () => {
    it('passes a string through', () => {
        expect(toUrl('/history')).toBe('/history');
    });

    /**
     * Wayfinder route helpers return objects, not strings. Interpolating one
     * directly yields `[object Object]`, which is how a nav link once shipped
     * pointing at nothing.
     */
    it('unwraps a Wayfinder route object', () => {
        expect(toUrl({ url: '/bookmarks', method: 'get' })).toBe('/bookmarks');
    });
});
