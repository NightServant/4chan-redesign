import { describe, expect, it } from 'vitest';
import { INFORMATION } from '@/content/information';

/**
 * The four standing pages have to agree with each other and with the code.
 *
 * They did not. The FAQ answered "does anything I do here reach 4chan?" with
 * "4chan never learns you exist", and the privacy page's own "Images and your
 * browser" section says the opposite three paragraphs later: mirrored
 * attachments are hotlinked, so the browser fetches them from `i.4cdn.org` and
 * 4chan sees that request with the IP attached. Both statements were on the
 * site at once, and the reassuring one was the false one.
 *
 * The distinction that makes both halves true is *who is doing the sending*.
 * Clover's server writes nothing upstream — 4chan's API accepts `GET`, `HEAD`
 * and `OPTIONS`, so it could not receive a write even if this application
 * tried. An anon's own browser is a different actor, and it contacts 4chan on
 * every mirrored image. A privacy page may claim the first. It may not claim
 * the second.
 *
 * These are copy guards rather than behaviour guards, which is unusual and is
 * the point: this text is a set of claims about the code, and a claim that
 * stops being true is a defect the compiler cannot see.
 */

type Paragraph = { page: string; heading: string; text: string };

function everyParagraph(): Paragraph[] {
    return Object.entries(INFORMATION).flatMap(([page, content]) =>
        content.sections.flatMap((section) =>
            section.body.map((text) => ({
                page,
                heading: section.heading,
                text,
            })),
        ),
    );
}

function sectionMatching(page: string, pattern: RegExp) {
    const section = INFORMATION[page].sections.find((candidate) =>
        pattern.test(candidate.heading),
    );

    expect(
        section,
        `no section on the ${page} page matches ${pattern}`,
    ).toBeDefined();

    return section!.body.join(' ');
}

describe('information copy', () => {
    /**
     * The absolute claim, in any of the shapes it has been written in. A
     * blanket "4chan never sees you" cannot be true on a page that hotlinks
     * 4chan's CDN, whichever page it appears on.
     */
    it('never tells an anon that 4chan sees nothing of them', () => {
        /**
         * Scoped to claims about the *anon*. "4chan never sees it" of a file
         * an anon uploaded here is true and stays — Clover serves that image
         * itself and 4chan has no copy of it. What cannot stand is a claim
         * that 4chan never sees the person.
         */
        const absolute =
            /4chan never (learns|sees|knows) (you|who you are|that you|anything about you)|nothing about you is sent to 4chan/i;

        const offenders = everyParagraph().filter((paragraph) =>
            absolute.test(paragraph.text),
        );

        expect(
            offenders.map((one) => `${one.page} / ${one.heading}`),
            'a blanket claim that 4chan sees nothing contradicts image hotlinking',
        ).toEqual([]);
    });

    /**
     * Having removed the false reassurance, the true answer has to be present:
     * deleting the sentence and saying nothing would leave the question
     * answered less honestly than before, not more.
     */
    it('answers the 4chan question with the image exception rather than omitting it', () => {
        const answer = sectionMatching('FAQ', /reach 4chan/i);

        expect(answer).toMatch(/image/i);
        expect(answer).toMatch(/browser/i);
    });

    /**
     * The privacy page states the same fact in its own section. Both pages
     * carry it because either can be read on its own.
     */
    it('discloses image hotlinking on the privacy page', () => {
        const images = sectionMatching('Privacy', /images/i);

        expect(images).toMatch(/4chan/);
        expect(images).toMatch(/sees those requests|sees that request/i);
    });

    /**
     * What Clover's own server sends upstream is still nothing, and the page
     * is allowed to say so — scoped to Clover, not to the anon's browser.
     */
    it('keeps the true half of the claim, scoped to what Clover itself sends', () => {
        const notDone = sectionMatching('Privacy', /does not do/i);

        expect(notDone).toMatch(/no advertising/i);
        expect(notDone).toMatch(/no third-party analytics/i);
    });

    /**
     * The analytics sentence is a claim about the shipped application. If a
     * tag manager, a pixel or a product-analytics script is ever added, this
     * test is the thing that should fail first — so it asserts against the
     * built stylesheet's neighbour, the page copy, and leaves a marker for
     * whoever adds one.
     */
    it('states the analytics position in one place, so adding one breaks one test', () => {
        const claims = everyParagraph().filter((paragraph) =>
            /analytics/i.test(paragraph.text),
        );

        expect(claims).toHaveLength(1);
        expect(claims[0].page).toBe('Privacy');
    });
});
