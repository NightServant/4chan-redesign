import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SectionGutter } from '@/components/home/section-gutter';
import { HOME_SECTION_TOTAL, homeSectionOrdinal } from '@/lib/home-sections';

function renderGutter(
    props: Partial<Parameters<typeof SectionGutter>[0]> = {},
) {
    return render(
        <SectionGutter
            side="left"
            ordinal="02"
            label="Popular boards"
            {...props}
        />,
    );
}

describe('SectionGutter', () => {
    it('sets the folio against the total the page actually has', () => {
        const { container } = renderGutter({ side: 'left', ordinal: '02' });

        expect(container.textContent).toContain('02');
        expect(container.textContent).toContain(
            `/ ${String(HOME_SECTION_TOTAL).padStart(2, '0')}`,
        );
    });

    it('sets the band name vertically down the right margin', () => {
        const { container } = renderGutter({
            side: 'right',
            label: 'Trending discussions',
        });

        const name = container.querySelector('span');

        expect(name).toHaveTextContent('Trending discussions');
        expect(name?.className).toContain('[writing-mode:vertical-rl]');
    });

    /**
     * The left margin carries the number and the right carries the name. Both
     * on both sides would be two marks competing at every band, and the number
     * repeated twice is the thing a folio exists not to do.
     */
    it('does not repeat the folio in the right margin', () => {
        const { container } = renderGutter({ side: 'right', ordinal: '02' });

        expect(container.textContent).not.toContain('02');
    });

    it('carries no name in the left margin', () => {
        const { container } = renderGutter({
            side: 'left',
            label: 'Popular boards',
        });

        expect(container.textContent).not.toContain('Popular boards');
    });

    /**
     * A band that is not on `HOME_SECTION_IDS` gets no mark at all. A margin
     * reading "00 / 05", or silently numbering an unlisted band, tells the
     * reader something false about where they are.
     */
    it('marks nothing when the band has no ordinal', () => {
        const { container } = renderGutter({
            side: 'left',
            ordinal: homeSectionOrdinal('not-a-band'),
        });

        expect(
            container.querySelector('[data-slot="machine-value"]'),
        ).toBeNull();
    });

    /**
     * The margins are hidden from assistive tech on purpose: the band is
     * already a named region with a heading, so a folio would announce the
     * name it just read, then a decorative rule. Asserted rather than assumed,
     * because five bands each announcing themselves twice is not a defect
     * anyone reads in a diff.
     */
    it('is hidden from assistive technology', () => {
        const { container } = renderGutter();

        expect(
            container.querySelector('[data-slot="section-gutter"]'),
        ).toHaveAttribute('aria-hidden', 'true');
    });

    /**
     * Below `xl` the column *is* the viewport and there is no margin to fill.
     * Marks would have to be taken out of the content's width to exist.
     */
    it('appears only where there is a margin to fill', () => {
        const { container } = renderGutter();

        const gutter = container.querySelector('[data-slot="section-gutter"]');

        expect(gutter?.className).toContain('hidden');
        expect(gutter?.className).toContain('xl:flex');
    });

    /** Hugging the column would leave the far edge as empty as it started. */
    it('anchors each mark to the outside edge, not to the column', () => {
        const { container: left } = renderGutter({ side: 'left' });
        const { container: right } = renderGutter({ side: 'right' });

        expect(
            left.querySelector('[data-slot="section-gutter"]')?.className,
        ).toContain('justify-start');
        expect(
            right.querySelector('[data-slot="section-gutter"]')?.className,
        ).toContain('justify-end');
    });
});
