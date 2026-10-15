import { describe, expect, it } from 'vitest';
import { CONTACT_EMAIL, INFORMATION } from '@/content/information';

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

/**
 * What a page about a request inbox must never promise.
 *
 * The inbox acknowledges and a person reads; that is all it does. Each guard
 * is a family of wordings, not one sentence, because a promise survives being
 * paraphrased: "we'll get back to you", "expect an answer in a couple of days"
 * and "usually the same week" are all the same promise as "within 48 hours".
 * Both apostrophes are matched, since the pages use a curly one and a person
 * editing them may type a straight one.
 */
const PROMISES_A_TIME =
    /\bwithin\b|\b\d+\s*(hours?|days?|weeks?)\b|business days?|promptly|quickly|as soon as|shortly|\bsoon\b|\b(we|will)\s+(reply|respond)|\brespond|get(ting)? back to|\bcouple of\b|\ba few (hours?|days?|weeks?)\b|\b(same|next) (day|week)\b|\bexpect an? (answer|reply|response)\b|\busually\b|\bturnaround\b/i;

const INVENTS_A_TEAM =
    /\b(support|moderation|trust|privacy|safety)\s+(team|staff)\b|\bour (team|staff)\b|\bwe[’'](ll|ve|re)\b|\bwe (will|shall|reply|respond|read|review)\b/i;

/**
 * Nothing on Clover removes a post or an account: the only thing that deletes
 * is `Importer::pruneThreads()`, which cleans up the mirror. "Are removed on
 * sight" and "goes with it" described moderation that never existed.
 * "To be taken down" is the request, not the outcome, so it is not matched;
 * "is not removed" is not either.
 */
const PROMISES_REMOVAL =
    /\b(are|is|get|gets|got|will be|would be|been)\s+(all\s+)?(removed|taken down)\b|\bon sight\b|\bgoes? with it\b|\b(we|clover)\s+(will\s+)?(remove|take down|delete)\b|\bwill (remove|delete|take down)\b/i;

function promisesAnything(text: string): string[] {
    return [
        PROMISES_A_TIME.test(text) && 'a time',
        INVENTS_A_TEAM.test(text) && 'a team',
        PROMISES_REMOVAL.test(text) && 'a removal',
    ].filter((found): found is string => found !== false);
}

/** Heading and body of every section on a page, as one string. */
function wholePage(page: string): string {
    return INFORMATION[page].sections
        .flatMap((section) => [section.heading, ...section.body])
        .join(' ');
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
     * A signed-out visitor never sees the adult boards: the opt-in lives in
     * settings, behind a sign-in. "None of it is behind a sign-in" was false
     * of a third of the boards, so the answer names the exception instead.
     */
    it('does not say every board can be read without an account', () => {
        const blanket =
            /every board[^.]*(public|without an account)|none of it is behind a sign-in|read any board without/i;

        const offenders = everyParagraph().filter((paragraph) =>
            blanket.test(paragraph.text),
        );

        expect(
            offenders.map((one) => `${one.page} / ${one.heading}`),
            'adult boards need a signed-in opt-in',
        ).toEqual([]);
        expect(sectionMatching('FAQ', /need an account/i)).toMatch(
            /adult boards/i,
        );
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
     * Deleting an account deletes its image rows at once, but the image route
     * is cached for a day by browsers and by the CDN in front of Clover
     * (`AttachmentController`). A page that says "deleted" and stops there
     * describes less than the system does, so both places that say it also
     * say how long a cached copy can last.
     */
    it('says a cached copy of a deleted image can outlive the account by up to a day', () => {
        const browser = sectionMatching('Privacy', /images and your browser/i);
        const deleting = sectionMatching('Privacy', /deleting what you leave/i);

        expect(browser).toMatch(/deleted with the account/);
        expect(browser).toMatch(/can take up to a day to expire/);
        expect(deleting).toMatch(/images going too/);
        expect(deleting).toMatch(/can take up to a day to expire/);
    });

    /**
     * What Clover's own server sends upstream is still nothing, and the page
     * is allowed to say so — scoped to Clover, not to the anon's browser.
     */
    it('keeps the true half of the claim, scoped to what Clover itself sends', () => {
        const notDone = sectionMatching('Privacy', /does not do/i);

        expect(notDone).toMatch(/no advertising/i);
        expect(notDone).toMatch(/Vercel Web Analytics/);
        expect(notDone).toMatch(/no cookies/i);
        expect(notDone).toMatch(/no other analytics/i);
    });

    /**
     * The analytics sentence is a claim about the shipped application: it
     * names Vercel Web Analytics, mounted in `app.tsx`, and nothing else. If a
     * tag manager, a pixel or another analytics script is ever added, this
     * is the place that has to change with it.
     */
    it('states the analytics position in one place, so adding one breaks one test', () => {
        const claims = everyParagraph().filter((paragraph) =>
            /analytics/i.test(paragraph.text),
        );

        expect(claims).toHaveLength(1);
        expect(claims[0].page).toBe('Privacy');
    });

    /**
     * The address belongs to a live inbox (`cloverrequests@gmail.com`), run by
     * an n8n workflow that files each request and sends back an automatic
     * acknowledgement. What a page may say about it is whatever that workflow
     * does, so the claim sits in one paragraph per page, on the two pages that
     * point visitors at it, and a change to either has to change the other.
     */
    describe('the contact address', () => {
        function contactClaims() {
            return everyParagraph().filter((paragraph) =>
                paragraph.text.includes(CONTACT_EMAIL),
            );
        }

        function claimOn(page: string) {
            return contactClaims().find((claim) => claim.page === page)!.text;
        }

        it('is the one inbox the workflow reads', () => {
            expect(CONTACT_EMAIL).toBe('cloverrequests@gmail.com');
        });

        it('is named in exactly one paragraph each on the rules and privacy pages, and nowhere else', () => {
            expect(contactClaims().map((claim) => claim.page)).toEqual([
                'Rules',
                'Privacy',
            ]);
        });

        it('is offered for privacy or data requests on the privacy page', () => {
            expect(claimOn('Privacy')).toMatch(/for privacy or data requests/i);
        });

        it('is offered for taking a post down on the rules page', () => {
            expect(claimOn('Rules')).toMatch(
                /to ask for a post to be taken down/i,
            );
        });

        describe.each(['Privacy', 'Rules'])('on the %s page', (page) => {
            it('promises what the workflow does: an acknowledgement with a reference, and a person reading', () => {
                const text = claimOn(page);

                expect(text).toMatch(/automatic acknowledgement/i);
                expect(text).toMatch(/reference number/i);
                expect(text).toMatch(/a person reads (every request|it)/i);
            });

            it('says no response time is promised', () => {
                expect(claimOn(page)).toMatch(/no response time is promised/i);
            });
        });

        it('says the removal of a post is not promised either, on the rules page', () => {
            expect(claimOn('Rules')).toMatch(
                /neither is the removal of any post/i,
            );
        });

        it('points the rules page at the privacy page for what happens to the email', () => {
            expect(sectionMatching('Rules', /report/i)).toMatch(
                /The Privacy page says what happens to your email/,
            );
        });
    });

    /**
     * The no-promise checks cover the whole of each place that talks about the
     * inbox, not just the paragraph that holds the address: a promise placed
     * in the paragraph beside it is the same promise.
     */
    describe('promises nothing the inbox does not do', () => {
        it('on the whole of the privacy section about requests', () => {
            const text = sectionMatching('Privacy', /asking about your data/i);

            expect(promisesAnything(text)).toEqual([]);
        });

        it('on the whole of the rules page', () => {
            expect(promisesAnything(wholePage('Rules'))).toEqual([]);
        });

        /**
         * The guards have to catch the wording they exist for. These are the
         * lines a reviewer slipped past the first version of this test, plus
         * the two claims the Rules page used to make.
         */
        it.each([
            ["We'll get back to you.", 'a team'],
            ['We’ll get back to you.', 'a team'],
            ["We'll get back to you.", 'a time'],
            ['Expect an answer in a couple of days.', 'a time'],
            ['Requests are usually answered the same week.', 'a time'],
            ['Our support team replies within a day.', 'a team'],
            ['Posts that break the rules are taken down.', 'a removal'],
            ['Offending posts are removed.', 'a removal'],
            ['The post will be removed.', 'a removal'],
            ['Clover will remove it.', 'a removal'],
            [
                'Personal information about a real person, organised brigading of another site, and anything unlawful are all removed on sight, and the account that posted them goes with it.',
                'a removal',
            ],
        ])('catches: %s (%s)', (text, kind) => {
            expect(promisesAnything(text)).toContain(kind);
        });

        it.each([
            'To ask for a post to be taken down, email someone.',
            'No response time is promised, and neither is the removal of any post.',
            'Clover cannot remove anything from 4chan.',
            'It deletes a mirrored thread when it next finds that 4chan no longer lists it.',
            'The post is not removed.',
            'The issue is deleted once the request is handled.',
        ])('leaves true wording alone: %s', (text) => {
            expect(promisesAnything(text)).toEqual([]);
        });

        it('no longer says doxxing, brigading or unlawful content is removed on sight', () => {
            const rule = sectionMatching('Rules', /doxxing/i);

            expect(rule).not.toMatch(/on sight|goes with it|are all removed/i);
            expect(rule).toMatch(/do not belong here/);
            expect(rule).toMatch(/Nothing on Clover enforces that by itself/);
        });
    });

    /**
     * What happens to a request is a privacy fact, so the privacy page says
     * where it goes. The Gmail copy is not claimed deleted: only the issue is,
     * which is all the handling procedure does.
     */
    describe('where a request goes', () => {
        it('is kept in the inbox and filed as an issue in a private repository', () => {
            const text = sectionMatching('Privacy', /asking about your data/i);

            expect(text).toMatch(/Gmail inbox/);
            expect(text).toMatch(/issue in a private GitHub repository/);
            expect(text).toMatch(/so a person can handle/);
        });

        it('deletes the issue, and only the issue, once a data request is handled', () => {
            const text = sectionMatching('Privacy', /asking about your data/i);

            expect(text).toMatch(
                /for a data request the issue is deleted once the request is handled/,
            );
            expect(text).not.toMatch(/\bemail is deleted|\ball copies\b/i);
        });

        /**
         * "Nothing here is sold or shared with anybody" sat beside a section
         * that puts request emails in Gmail and a private GitHub repository.
         * Both are services holding the email, so the sentence names the
         * exception and points at the section that describes it.
         */
        it('does not say nothing is shared without naming the request emails', () => {
            const text = sectionMatching('Privacy', /does not do/i);

            expect(text).toMatch(
                /Nothing here is sold or shared with anybody, apart from the request emails covered under Asking about your data\./,
            );
            expect(
                INFORMATION.Privacy.sections.map((s) => s.heading),
            ).toContain('Asking about your data');
        });
    });

    /**
     * Pruning is the code's own answer to a mirrored post that 4chan has let
     * go, and the Rules page describes it. `Importer::pruneThreads()` spares a
     * thread someone saved or wrote a reply in, so the page says so rather
     * than claiming every pruned post leaves.
     */
    describe('what happens to a mirrored post', () => {
        it('leaves Clover when 4chan stops listing it, unless someone saved it or replied in it', () => {
            const text = sectionMatching('Rules', /report/i);

            expect(text).toMatch(/cannot remove anything from 4chan/);
            expect(text).toMatch(/no longer lists it/);
            expect(text).toMatch(
                /unless someone has saved the thread or written a reply in it here/,
            );
        });
    });
});
