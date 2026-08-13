import { describe, expect, it } from 'vitest';
import {
    HOME_SECTION_IDS,
    HOME_SECTION_TOTAL,
    homeSectionOrdinal,
} from '@/lib/home-sections';

describe('homeSectionOrdinal', () => {
    it('numbers the bands from one, two digits wide', () => {
        expect(homeSectionOrdinal('top')).toBe('01');
        expect(homeSectionOrdinal('boards')).toBe('02');
        expect(homeSectionOrdinal('how')).toBe('05');
    });

    it('returns nothing for a band that is not on the page', () => {
        expect(homeSectionOrdinal('nope')).toBeNull();
    });

    it('counts every band exactly once', () => {
        expect(HOME_SECTION_TOTAL).toBe(HOME_SECTION_IDS.length);
        expect(new Set(HOME_SECTION_IDS).size).toBe(HOME_SECTION_IDS.length);
    });

    /**
     * The ordinal and the total come from the same list, so a band added or
     * removed moves both. Written as a guard because the failure mode is a
     * margin that reads "05 / 04" — wrong, and wrong quietly.
     */
    it('never numbers a band past the total it prints beside it', () => {
        for (const id of HOME_SECTION_IDS) {
            expect(Number(homeSectionOrdinal(id))).toBeLessThanOrEqual(
                HOME_SECTION_TOTAL,
            );
        }
    });
});
