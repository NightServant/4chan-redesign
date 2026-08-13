/**
 * The homepage's bands, in the order they are stacked.
 *
 * One list rather than a number written into each band, because the folio
 * marks in the margins count "02 / 05" and a hand-written ordinal drifts the
 * moment a band is added, removed or reordered. Both the ordinal and the total
 * are read from here, so neither can disagree with the page.
 */
type HomeSectionId = 'top' | 'boards' | 'trending' | 'features' | 'how';

const HOME_SECTION_IDS: readonly HomeSectionId[] = [
    'top',
    'boards',
    'trending',
    'features',
    'how',
];

/** How many bands the page has, for the "/ 05" half of a folio mark. */
const HOME_SECTION_TOTAL = HOME_SECTION_IDS.length;

/**
 * Two digits, one-based, as the margins set it: `01`, not `1`.
 *
 * A band that is not on the list gets no ordinal rather than a wrong one — an
 * unnumbered margin is a missing mark, a mis-numbered one is a lie about where
 * the reader is.
 */
function homeSectionOrdinal(id: string): string | null {
    const index = HOME_SECTION_IDS.indexOf(id as HomeSectionId);

    if (index === -1) {
        return null;
    }

    return String(index + 1).padStart(2, '0');
}

export { HOME_SECTION_IDS, HOME_SECTION_TOTAL, homeSectionOrdinal };
export type { HomeSectionId };
