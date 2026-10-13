import type { Paged } from '@/types/clover';

/**
 * The rows of a list the server may or may not have paged.
 *
 * The search page's three lists are paged on a tab of their own and plain
 * slices on All, so the same prop arrives as a wrapped `{ data }` on one and
 * as a bare array on the other.
 */
export function rowsOf<T>(list: T[] | Paged<T>): T[] {
    return Array.isArray(list) ? list : list.data;
}
