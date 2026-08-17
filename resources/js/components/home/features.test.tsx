import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Features } from '@/components/home/features';

/**
 * `useIsMobile` reads a real `matchMedia`, which jsdom does not implement.
 * This supplies one whose answer each test sets — the whole point of the item
 * being that the two widths render two different things: an accordion below
 * `md`, the plain list above it.
 *
 * Mirrors `account/edit-profile-dialog.test.tsx`, which makes the same choice
 * between a sheet and a dialog for the same reason.
 */
function setViewport(isMobile: boolean): void {
    vi.stubGlobal('matchMedia', (query: string) => ({
        matches: isMobile,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }));
}

beforeEach(() => {
    setViewport(true);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

const TITLES = [
    'Anonymous by default',
    'Fast on purpose',
    'Nothing to score',
    'Nothing goes back',
    'Greentext preserved',
    'Boards, not follows',
];

const FIRST_BODY =
    'Read any board without an account. Replying needs one, and every reply is still signed Anonymous.';

const SCORE_BODY =
    'No votes, no karma, no reputation. A thread rises because anons replied to it, and you can send one to somebody without an account existing anywhere.';

describe('Features — below `md`, an accordion', () => {
    it('renders the section heading', () => {
        render(<Features />);

        expect(
            screen.getByRole('heading', {
                name: 'Built for reading, not for engagement',
            }),
        ).toBeInTheDocument();
    });

    /**
     * Six cards became six tabs, and task 13 turns those into an accordion.
     * Every claim is still on the page and still the control, so the list is
     * the thing that has to stay complete whatever the mechanism.
     */
    it('offers every claim as a control', () => {
        render(<Features />);

        const triggers = screen.getAllByRole('button');

        expect(triggers.map((trigger) => trigger.textContent)).toEqual(TITLES);
    });

    /**
     * The point of the whole item: "an accordion whose triggers are `div`s is
     * a list a screen reader cannot navigate." Each claim is a real level-3
     * heading with the button inside it, so the band appears in the document
     * outline and can be jumped between heading by heading.
     */
    it('makes every trigger a real heading', () => {
        render(<Features />);

        const headings = screen.getAllByRole('heading', { level: 3 });

        expect(headings.map((heading) => heading.textContent)).toEqual(TITLES);

        for (const title of TITLES) {
            expect(
                screen.getByRole('button', { name: title }).closest('h3'),
            ).not.toBeNull();
        }
    });

    /**
     * Collapsed is the resting state. Radix unmounts a closed region outright,
     * so a description that is not open is not in the document at all rather
     * than merely hidden.
     */
    it('collapses the descriptions it is not showing', () => {
        render(<Features />);

        expect(screen.queryByText(SCORE_BODY)).not.toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Nothing to score' }),
        ).toHaveAttribute('aria-expanded', 'false');
    });

    it('opens the first claim so the band is never a row of closed titles', () => {
        render(<Features />);

        expect(screen.getByText(FIRST_BODY)).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Anonymous by default' }),
        ).toHaveAttribute('aria-expanded', 'true');
    });

    it('reveals a description when its title is pressed', async () => {
        const user = userEvent.setup();

        render(<Features />);
        await user.click(
            screen.getByRole('button', { name: 'Nothing to score' }),
        );

        expect(screen.getByText(SCORE_BODY)).toBeInTheDocument();
    });

    /**
     * "Pressing a feature's title **or icon**." The icon is inside the trigger
     * rather than beside it, so there is one control and no dead glyph next to
     * it — pressing the icon is pressing the button.
     */
    it('reveals a description when its icon is pressed', async () => {
        const user = userEvent.setup();

        render(<Features />);

        const trigger = screen.getByRole('button', {
            name: 'Nothing to score',
        });
        const icon = trigger.querySelector('svg');

        expect(icon).not.toBeNull();

        await user.click(icon as SVGElement);

        expect(screen.getByText(SCORE_BODY)).toBeInTheDocument();
    });

    /**
     * One claim answered at a time, which is the argument the tabs version
     * made and the reason this is an accordion rather than six independent
     * disclosures: six open bodies is the wall of copy the band stopped being.
     */
    it('shows one answer at a time', async () => {
        const user = userEvent.setup();

        render(<Features />);
        await user.click(
            screen.getByRole('button', { name: 'Nothing to score' }),
        );

        expect(screen.getByText(SCORE_BODY)).toBeInTheDocument();
        expect(screen.queryByText(FIRST_BODY)).not.toBeInTheDocument();
    });

    /** Pressing the open one closes it. A disclosure that cannot close is a label. */
    it('closes the open claim when its own title is pressed again', async () => {
        const user = userEvent.setup();

        render(<Features />);
        await user.click(
            screen.getByRole('button', { name: 'Anonymous by default' }),
        );

        expect(screen.queryByText(FIRST_BODY)).not.toBeInTheDocument();
    });

    /**
     * The greentext body contains a literal `>` that must survive JSX
     * escaping, since it is the one claim whose subject is the character
     * itself.
     */
    it('keeps the literal > in the greentext body', async () => {
        const user = userEvent.setup();

        render(<Features />);
        await user.click(
            screen.getByRole('button', { name: 'Greentext preserved' }),
        );

        const body = screen.getByText(
            'Markdown, quotes and >greentext work the way they always have.',
        );

        expect(body.textContent).toContain('>greentext');
    });

    /**
     * The band was six bordered tiles on a page whose own rule is that
     * sections are divided by hairlines rather than stacked as slabs. The
     * accordion keeps that rule: rows separated by a line, no box per claim.
     */
    it('renders no cards', () => {
        const { container } = render(<Features />);

        expect(container.querySelector('[data-slot="card"]')).toBeNull();
    });

    it('rules the claims as grid cells rather than boxing each one', () => {
        const { container } = render(<Features />);

        const list = container.querySelector<HTMLElement>(
            '[data-slot="features-list"]',
        );

        /* The container draws the top and left edges; every cell draws its own
           right and bottom. Each interior line is then drawn exactly once by
           exactly one element, at one, two and three columns alike. */
        expect(list?.className).toMatch(/(^|\s)border-t(\s|$)/);
        expect(list?.className).not.toMatch(/(^|\s)border-l(\s|$)/);
        expect(list?.className).not.toMatch(/(^|\s)border-r(\s|$)/);
        expect(list?.className).not.toMatch(/(^|\s)border-b(\s|$)/);

        /* Flush with `Section`'s own `border-x`: `-ml-6` cancels the content
           column's left padding, and `-mr-[25px]` is that 24px plus one more,
           so the last cell's right-hand rule falls exactly on the section's
           rather than beside it. */
        expect(list?.className).toMatch(/(^|\s)-ml-6(\s|$)/);
        expect(list?.className).toMatch(/(^|\s)-mr-\[25px\](\s|$)/);

        const cells = Array.from(
            container.querySelectorAll<HTMLElement>(
                '[data-slot="collapsible"]',
            ),
        );

        expect(cells).toHaveLength(6);

        for (const cell of cells) {
            expect(cell.className).toMatch(/(^|\s)border-r(\s|$)/);
            expect(cell.className).toMatch(/(^|\s)border-b(\s|$)/);
            /* No box of its own: not a card, and no second copy of the edges
               the container already draws. */
            expect(cell.className).not.toMatch(/rounded-/);
            expect(cell.className).not.toMatch(/(^|\s)border(\s|$)/);
            expect(cell.className).not.toMatch(/(^|\s)border-l(\s|$)/);
            expect(cell.className).not.toMatch(/(^|\s)border-t(\s|$)/);
            /* The padding the column used to give moved in here, so the copy
               is not set against the rules. */
            expect(cell.className).toMatch(/(^|\s)(p-6|px-6)(\s|$)/);
        }
    });

    it('contains no em dashes anywhere in its rendered text', () => {
        const { container } = render(<Features />);

        expect(container.textContent).not.toMatch(/—|--/);
    });
});

/**
 * At `md` and up the band is unchanged: every description on screen, nothing
 * collapsed, nothing to press. Gabe's correction, 2026-08-17.
 *
 * Guarded by flipping the mocked viewport rather than by reading classes,
 * because a class-gated accordion is exactly the thing this rules out — it
 * would leave six triggers announcing "collapsed" over content that is
 * permanently visible, controls claiming to do something they do not.
 */
describe('Features — at `md` and up, the whole list', () => {
    beforeEach(() => {
        setViewport(false);
    });

    it('shows every description at once', () => {
        render(<Features />);

        expect(screen.getByText(FIRST_BODY)).toBeInTheDocument();
        expect(screen.getByText(SCORE_BODY)).toBeInTheDocument();
        expect(
            screen.getByText(
                'Markdown, quotes and >greentext work the way they always have.',
            ),
        ).toBeInTheDocument();
    });

    it('offers nothing to press', () => {
        render(<Features />);

        expect(screen.queryAllByRole('button')).toHaveLength(0);
        expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    });

    /**
     * The band was one column at every width, and at ~1420px that left about a
     * thousand pixels of empty paper beside six short items while the section
     * ran nearly 800px tall. Two columns at `md`, three at `lg`.
     *
     * At `lg` three columns of a 1180px page give roughly 380px each, which is
     * a comfortable measure for a two-line description — that is arithmetic off
     * the `--measure-page` token, not something jsdom laid out.
     */
    it('sets the claims in two columns at `md` and three at `lg`', () => {
        const { container } = render(<Features />);

        const list = container.querySelector<HTMLElement>(
            '[data-slot="features-list"]',
        );

        expect(list?.className).toMatch(/(^|\s)grid(\s|$)/);
        expect(list?.className).toMatch(/(^|\s)md:grid-cols-2(\s|$)/);
        expect(list?.className).toMatch(/(^|\s)lg:grid-cols-3(\s|$)/);
    });

    /**
     * The same rule pattern at this width, drawn by the same two class sets.
     * `divide-y` is explicitly not it: it draws in DOM order, so in a
     * three-column grid it would put a hairline above items 2 through 6, which
     * is a line through the middle of a row rather than between rows.
     */
    it('rules the cells on both axes here too, without divide-y', () => {
        const { container } = render(<Features />);

        const list = container.querySelector<HTMLElement>(
            '[data-slot="features-list"]',
        );

        expect(list?.className).not.toMatch(/divide-y/);
        expect(list?.className).toMatch(/(^|\s)border-t(\s|$)/);
        expect(list?.className).toMatch(/(^|\s)-ml-6(\s|$)/);

        const cells = Array.from(list?.children ?? []) as HTMLElement[];

        expect(cells).toHaveLength(6);

        for (const cell of cells) {
            expect(cell.className).toMatch(/(^|\s)border-r(\s|$)/);
            expect(cell.className).toMatch(/(^|\s)border-b(\s|$)/);
            expect(cell.className).toMatch(/(^|\s)(p-6|px-6)(\s|$)/);
        }
    });

    /** Still six real headings, so the outline is the same at both widths. */
    it('keeps every claim a real heading', () => {
        render(<Features />);

        expect(
            screen
                .getAllByRole('heading', { level: 3 })
                .map((heading) => heading.textContent),
        ).toEqual(TITLES);
    });
});
