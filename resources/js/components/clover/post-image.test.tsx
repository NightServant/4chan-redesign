import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PostAttachment, PostImage } from '@/components/clover/post-image';
import { makeAttachment, makeComment } from '@/fixtures/factories';

/* Only rendered on the branch where a feed row's image is a link to its
   thread; the rest of this suite never reaches Inertia at all. */
vi.mock('@inertiajs/react', () => ({
    Link: ({
        href,
        children,
        ...props
    }: { href: string; children: ReactNode } & Record<string, unknown>) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('PostImage', () => {
    /**
     * Neither variant uses the thumbnail, and that is the sizing decision.
     *
     * 4chan caps thumbnails at 250px on the long side for an OP and 125px for
     * a reply — a reply thumbnail is smaller than the avatar beside it. There
     * is no intermediate rendition to ask for, so the original is what loads,
     * held to a sane size by CSS.
     */
    it.each(['card', 'post'] as const)(
        'loads the file itself on a %s, since the thumbnail is too small to read',
        (variant) => {
            const media = makeAttachment();

            render(<PostImage media={media} variant={variant} />);

            const image = screen.getByRole('img', {
                name: `Attached image: ${media.filename}`,
            });

            expect(image).toHaveAttribute('src', media.fullUrl);
            expect(image).not.toHaveAttribute('src', media.thumbnailUrl);
        },
    );

    /**
     * A feed row's image fills its box, which is what stops a ragged margin
     * down one side of the feed: the box is a uniform grid cell and the
     * picture is cropped to it.
     *
     * The thread page is the opposite case and deliberately so -- there the
     * box is sized to the file rather than the file to the box, because that
     * screen exists to show the picture whole. See the post-variant tests
     * below.
     */
    it.each(['card'] as const)(
        'fills the column width on a %s rather than sizing from its height',
        (variant) => {
            render(<PostImage media={makeAttachment()} variant={variant} />);

            const image = screen.getByRole('img');

            expect(image).toHaveClass('w-full');
            expect(image).not.toHaveClass('w-auto');
        },
    );

    it('does not inset the image inside a narrower box', () => {
        render(<PostImage media={makeAttachment()} />);

        expect(screen.getByRole('button')).toHaveClass('w-full');
    });

    /**
     * The two variants are bounded by different mechanisms now (task 12). A
     * card is a cell in a uniform grid, so its box is a fixed ratio and the
     * image is cropped into it; a post is the file being read, so it keeps the
     * height cap and is shown whole under it.
     */
    it('bounds a card by its ratio and a post by its height cap', () => {
        const media = makeAttachment();

        const { unmount } = render(<PostImage media={media} variant="card" />);

        expect(screen.getByRole('button')).toHaveClass('aspect-[16/9]');
        expect(screen.getByRole('img')).not.toHaveClass('max-h-[520px]');

        unmount();

        render(<PostImage media={media} variant="post" />);

        expect(screen.getByRole('button')).not.toHaveClass('aspect-[16/9]');
        expect(screen.getByRole('img')).toHaveClass('max-h-[720px]');
    });

    it('defaults to the card variant, the cropped box', () => {
        render(<PostImage media={makeAttachment()} />);

        expect(screen.getByRole('button')).toHaveClass('aspect-[16/9]');
        expect(screen.getByRole('img')).toHaveClass('object-cover');
    });

    /**
     * Task 12, and every assertion here is a class contract: jsdom has no
     * layout engine, so nothing below measures a box. What is checked is that
     * the classes which produce the box are present, absent, or unprefixed.
     */
    describe('the box (task 12)', () => {
        /**
         * A feed is a uniform grid, and a tall 4chan image must not be allowed
         * to set the row height. Cropped rather than contained, and anchored
         * to the *top* of the image: an OP's subject is nearly always at the
         * top, and centre-cropping a tall one is exactly what loses it.
         */
        it('crops a card from the top of the image', () => {
            render(<PostImage media={makeAttachment()} variant="card" />);

            const image = screen.getByRole('img');

            expect(image).toHaveClass('object-cover');
            expect(image).toHaveClass('object-top');
            expect(image).not.toHaveClass('object-contain');
        });

        /**
         * The thread page is where the file is actually being looked at, so
         * nothing there is cropped. It carries neither half of the card's
         * mechanism.
         */
        it('leaves the post variant uncropped', () => {
            render(<PostImage media={makeAttachment()} variant="post" />);

            const image = screen.getByRole('img');

            expect(image).toHaveClass('object-contain');
            expect(image).not.toHaveClass('object-cover');
            expect(image).not.toHaveClass('object-top');
            expect(screen.getByRole('button').className).not.toMatch(/aspect-/);
        });

        /**
         * The point of the fixed ratio: a 400x4000 infographic and a 4000x400
         * banner produce the same row. The box cannot depend on the file, so
         * the classes that draw it must be identical for both — and the `<img>`
         * must not be carrying an intrinsic-size class of its own either.
         */
        it('gives a tall and a wide image the same box in a feed', () => {
            const tall = makeAttachment({ width: 400, height: 4000 });
            const wide = makeAttachment({ width: 4000, height: 400 });

            const { unmount } = render(
                <PostImage media={tall} variant="card" />,
            );

            const tallBox = screen.getByRole('button').className;
            const tallImage = screen.getByRole('img').className;

            unmount();

            render(<PostImage media={wide} variant="card" />);

            expect(screen.getByRole('button').className).toBe(tallBox);
            expect(screen.getByRole('img').className).toBe(tallImage);
            expect(tallBox).toContain('aspect-[16/9]');
        });

        /**
         * Gabe's addition, 2026-08-17: in a 760px column (840px past 1536px) a
         * full-bleed image is wider than everything else on the page and reads
         * as a banner. The box takes the column up to a cap and stops.
         *
         * It caps the box, not the crop, so both variants carry it — the
         * thread page's column is the same 760px.
         */
        /* Feed rows only. The thread page's column already caps itself at
           `--measure-column`, so a second cap inside it left the image fixed
           while the column grew -- which is the gap that kept coming back. */
        /* The shared token, not a literal. `--measure-media` caps the feed
           column too, so a change to one is a change to both -- when they
           were separate numbers the column ran to 760px while the image
           stopped at 560 and every row ended in empty paper. */
        it('caps the width of a card box at the shared media measure', () => {
            render(<PostImage media={makeAttachment()} variant="card" />);

            expect(screen.getByRole('button')).toHaveClass(
                'max-w-(--measure-media)',
            );
        });

        /* Sized to the file, bounded by the column, centred in it. A fixed
           cap left the image small while the column grew; `w-full` made the
           box full width and let `object-contain` paint a portrait file
           centred inside it with empty bands. */
        it('sizes a post box to its image and centres it', () => {
            render(<PostImage media={makeAttachment()} variant="post" />);

            const box = screen.getByRole('button');

            expect(box).toHaveClass('w-fit');
            expect(box).toHaveClass('self-center');
            expect(box.className).not.toMatch(/max-w-\(--measure-media\)/);
            expect(box.className).not.toMatch(/(^|\s)w-full(\s|$)/);
            expect(screen.getByRole('img')).toHaveClass('w-auto');
        });

        /**
         * A feed row's image belongs to the row above it. Aligned to the same
         * leading edge as the title and the stats, not centred against them.
         */
        it('leaves the card box on the column edge, aligned with its row', () => {
            const { container } = render(
                <PostImage media={makeAttachment()} variant="card" />,
            );

            const box = container.querySelector<HTMLElement>(
                '[data-slot="post-image"]',
            );

            expect(box?.className).not.toMatch(/(^|\s)self-center(\s|$)/);
            expect(box?.className).not.toMatch(/(^|\s)mx-auto(\s|$)/);
        });

        /**
         * "At every width, not only on phones." A cap written as `md:max-w-…`
         * would hold at 1280 and at 2545 and do nothing at 390, or the reverse;
         * an unprefixed one holds everywhere. jsdom applies no stylesheet and
         * cannot be resized, so the guard is that no breakpoint prefix is
         * attached to any width class on the box.
         */
        it.each(['card', 'post'] as const)(
            'applies the %s cap at every width rather than behind a breakpoint',
            (variant) => {
                render(
                    <PostImage media={makeAttachment()} variant={variant} />,
                );

                const box = screen.getByRole('button').className;

                expect(box).not.toMatch(
                    /(sm|md|lg|xl|2xl|min-\[|max-\[):max-w-/,
                );
            },
        );
    });

    /**
     * The file's own dimensions, not the thumbnail's. Reserving the
     * thumbnail's shape while loading the original would reserve the wrong
     * aspect ratio and reintroduce the shift this prevents.
     */
    it('reserves the box from the full image dimensions', () => {
        const media = makeAttachment({
            width: 1920,
            height: 1080,
            thumbWidth: 250,
            thumbHeight: 140,
        });

        render(<PostImage media={media} variant="card" />);

        const image = screen.getByRole('img');

        expect(image).toHaveAttribute('width', '1920');
        expect(image).toHaveAttribute('height', '1080');
    });

    /**
     * Lazily in both variants. Loading the original is only affordable
     * because a feed fetches the two or three attachments on screen rather
     * than all thirty.
     */
    it.each(['card', 'post'] as const)(
        'lazy-loads the %s variant',
        (variant) => {
            render(<PostImage media={makeAttachment()} variant={variant} />);

            expect(screen.getByRole('img')).toHaveAttribute('loading', 'lazy');
        },
    );

    it('sends no referrer to the CDN', () => {
        render(<PostImage media={makeAttachment()} />);

        expect(screen.getByRole('img')).toHaveAttribute(
            'referrerpolicy',
            'no-referrer',
        );
    });

    /**
     * The viewer is the whole screen on a phone, and its controls sit where a
     * thumb is.
     *
     * Gabe's spec: tapping the post opens the full image with controls at the
     * bottom, and those controls must be tappable. A centred card with a
     * 24px close cross in its corner is a desktop dialog wearing a phone's
     * viewport -- the image ends up smaller than it was in the thread, and
     * the one control is the hardest thing on the screen to hit.
     */
    it('fills the screen below `md` and returns to a panel at `md` and up', async () => {
        const user = userEvent.setup();
        const media = makeAttachment();

        render(<PostImage media={media} />);

        await user.click(
            screen.getByRole('button', {
                name: `Attached image: ${media.filename}`,
            }),
        );

        const dialog = screen.getByRole('dialog');

        expect(dialog).toHaveClass('h-dvh');
        expect(dialog).toHaveClass('max-w-none');
        expect(dialog.className).toMatch(/md:h-auto/);
    });

    /**
     * The viewer's drawer, below `md`.
     *
     * Gabe's request: tapping the picture should not cut an anon off from the
     * conversation it belongs to. The replies and the way into the composer
     * sit behind a control at the foot of the viewer -- closed on arrival,
     * because the screen was opened to look at the image, and capped at half
     * the viewport so the picture is still there when it opens.
     */
    /**
     * The viewer is a place, not a lightbox: the community at the top, the
     * picture, the replies behind a control, and the way in at the foot.
     *
     * A feed row carries no comments, so its drawer fetches them the first
     * time it is opened -- once, and only then. Sending every thread's tree
     * with the feed would be tens of thousands of rows for the handful anyone
     * opens; the thread page passes `viewerDrawer` instead and never fetches.
     */
    /**
     * The viewer's image fills the space it is given, ratio intact.
     *
     * `h-auto w-auto` rendered the file at its intrinsic size, so a 1024x760
     * image sat small in the middle of a phone's screen -- a viewer showing a
     * picture smaller than the row it was opened from. At `md` and up the
     * panel is sized to the image instead, which is the opposite rule and
     * still correct there.
     */
    /**
     * A grid item's minimum size is `auto` -- its content's intrinsic size --
     * so a 1024px file made the viewer's middle track 1024px wide inside a
     * 320px dialog and the picture ran off both edges, with the filename
     * doing the same in the row above it.
     */
    it('lets its rows shrink below the file`s intrinsic width', async () => {
        const user = userEvent.setup();
        const media = makeAttachment();

        render(<PostImage media={media} />);

        await user.click(
            screen.getByRole('button', {
                name: `Attached image: ${media.filename}`,
            }),
        );

        const full = screen
            .getAllByRole('img', { name: `Attached image: ${media.filename}` })
            .at(-1);

        expect(full?.parentElement).toHaveClass('min-w-0');
        expect(full?.parentElement).toHaveClass('overflow-hidden');
    });

    /**
     * The extremes, because an imageboard carries both.
     *
     * A 96x96 reaction image blown up to a phone's screen is a wall of mush;
     * a 4000px photograph left at its own size runs off every edge. Filling
     * the viewer handles the second and breaks the first, so the fill is
     * capped at the file's own dimensions: small files sit true, large ones
     * fill.
     */
    it.each([
        ['a tiny file', 96, 96],
        ['a huge file', 4000, 3000],
        ['a very tall file', 500, 6000],
    ])('never renders %s larger than itself', async (_label, width, height) => {
        const user = userEvent.setup();
        const media = makeAttachment({ width, height });

        render(<PostImage media={media} />);

        await user.click(
            screen.getByRole('button', {
                name: `Attached image: ${media.filename}`,
            }),
        );

        /* The file's size reaches the CSS as custom properties on the panel,
           inherited by the image. Inline `max-width` would have won over
           every breakpoint's own rule -- which is what clipped the picture on
           wide screens. */
        const panel = screen.getByRole('dialog');

        expect(panel.style.getPropertyValue('--file-w')).toBe(`${width}px`);
        expect(panel.style.getPropertyValue('--file-h')).toBe(`${height}px`);
        expect(panel.style.getPropertyValue('--file-ratio')).toBe(
            String(width / height),
        );
    });

    /**
     * 4chan sends dimensions for every attachment, but a local upload that
     * failed to measure has none. No cap to apply then, and the fill stands
     * rather than the image collapsing to nothing.
     */
    it('applies no cap when the file carries no dimensions', async () => {
        const user = userEvent.setup();
        const media = makeAttachment({ width: null, height: null });

        render(<PostImage media={media} />);

        await user.click(
            screen.getByRole('button', {
                name: `Attached image: ${media.filename}`,
            }),
        );

        const full = screen
            .getAllByRole('img', { name: `Attached image: ${media.filename}` })
            .at(-1);

        /* No dimensions to cap with, so the properties fall back to the box
           itself and the fill stands rather than the image collapsing. */
        const panel = screen.getByRole('dialog');

        expect(panel.style.getPropertyValue('--file-w')).toBe('100%');
        expect(panel.style.getPropertyValue('--file-h')).toBe('100%');
        expect(full).toHaveClass('w-full');
    });

    /**
     * The panel's column is a definite share of it, not `auto`.
     *
     * An implicit grid column sizes to its content, and the content is an
     * image whose `height: 100%` and intrinsic ratio asked for 769px: the row
     * took it, so a 1170x1151 file made a 662px row inside a 429px panel and
     * ran 208px off a 438px screen. Reproduced at that exact width with that
     * exact file before this was changed.
     */
    it('gives the panel a definite column so its rows cannot outgrow it', async () => {
        const user = userEvent.setup();
        const media = makeAttachment({ width: 1170, height: 1151 });

        render(<PostImage media={media} />);

        await user.click(
            screen.getByRole('button', {
                name: `Attached image: ${media.filename}`,
            }),
        );

        expect(screen.getByRole('dialog')).toHaveClass('grid-cols-1');
    });

    /**
     * Below `md` the image is bounded by its box, not by the file. The panel
     * is the whole screen there, so the box is already the right bound --
     * `max-w-[var(--file-w)]` let a 1170px file size the element from its own
     * width instead.
     */
    it('bounds the image by its box below `md`', async () => {
        const user = userEvent.setup();
        const media = makeAttachment({ width: 1170, height: 1151 });

        render(<PostImage media={media} />);

        await user.click(
            screen.getByRole('button', {
                name: `Attached image: ${media.filename}`,
            }),
        );

        const full = screen
            .getAllByRole('img', { name: `Attached image: ${media.filename}` })
            .at(-1);

        expect(full).toHaveClass('max-w-full');
        expect(full?.className).not.toMatch(/max-w-\[var\(--file-w\)\]/);
    });

    it('fills the viewer below `md` and sizes to the image above it', async () => {
        const user = userEvent.setup();
        const media = makeAttachment();

        render(<PostImage media={media} />);

        await user.click(
            screen.getByRole('button', {
                name: `Attached image: ${media.filename}`,
            }),
        );

        const full = screen
            .getAllByRole('img', { name: `Attached image: ${media.filename}` })
            .at(-1);

        expect(full).toHaveClass('h-full');
        expect(full).toHaveClass('w-full');
        expect(full).toHaveClass('object-contain');
        expect(full?.className).toMatch(/md:h-auto/);
        expect(full?.className).toMatch(/md:w-auto/);
    });

    it('names the community and fetches replies the first time the drawer opens', async () => {
        const user = userEvent.setup();
        const media = makeAttachment();
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: () =>
                Promise.resolve({
                    comments: [makeComment({ body: 'Fetched reply.' })],
                }),
        });
        vi.stubGlobal('fetch', fetchMock);

        render(
            <PostImage
                media={media}
                board="/g/"
                threadHref="/g/58210441"
                repliesUrl="/g/58210441/replies"
            />,
        );

        await user.click(
            screen.getByRole('button', {
                name: `Attached image: ${media.filename}`,
            }),
        );

        expect(screen.getByText('/g/')).toBeInTheDocument();
        expect(fetchMock).not.toHaveBeenCalled();

        await user.click(screen.getByRole('button', { name: /replies/i }));

        expect(await screen.findByText('Fetched reply.')).toBeInTheDocument();
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(
            screen.getByRole('link', { name: 'Join the conversation' }),
        ).toHaveAttribute('href', '/g/58210441');
    });

    it('hides the drawer behind a control and opens it on press', async () => {
        const user = userEvent.setup();
        const media = makeAttachment();

        render(
            <PostImage
                media={media}
                viewerDrawer={<p>A reply lives here.</p>}
                viewerDrawerLabel="312 replies"
            />,
        );

        await user.click(
            screen.getByRole('button', {
                name: `Attached image: ${media.filename}`,
            }),
        );

        const trigger = screen.getByRole('button', { name: /312 replies/ });

        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        expect(
            screen.queryByText('A reply lives here.'),
        ).not.toBeInTheDocument();

        await user.click(trigger);

        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText('A reply lives here.')).toBeInTheDocument();
    });

    /**
     * A feed row opens the same viewer with no comments in hand, so it has no
     * drawer at all rather than an empty one under a control promising
     * replies.
     */
    it('renders no drawer control when the caller passed none', async () => {
        const user = userEvent.setup();
        const media = makeAttachment();

        render(<PostImage media={media} />);

        await user.click(
            screen.getByRole('button', {
                name: `Attached image: ${media.filename}`,
            }),
        );

        expect(
            screen.queryByRole('button', { name: /replies/i }),
        ).not.toBeInTheDocument();
    });

    it('carries a close control and a bottom bar of real touch targets', async () => {
        const user = userEvent.setup();
        const media = makeAttachment();

        render(<PostImage media={media} />);

        await user.click(
            screen.getByRole('button', {
                name: `Attached image: ${media.filename}`,
            }),
        );

        /* The dialog's own close control, not a second one beside it. It
           carries the 44px hit area now -- task 5 scoped this file out and
           the full-screen viewer is what brought it back. */
        const close = screen.getByRole('button', { name: 'Close' });
        const original = screen.getByRole('link', { name: /original file/i });

        expect(close).toHaveClass('touch-target-44');
        expect(original).toHaveClass('touch-target-44');
        expect(original).toHaveAttribute('href', media.fullUrl);
    });

    /**
     * Escape and the close control both work, because a full-screen viewer
     * with one way out is a trap on the device that has no Escape key.
     */
    it('closes on the control and on Escape', async () => {
        const user = userEvent.setup();
        const media = makeAttachment();

        render(<PostImage media={media} />);

        const thumbnail = screen.getByRole('button', {
            name: `Attached image: ${media.filename}`,
        });

        await user.click(thumbnail);
        await user.click(screen.getByRole('button', { name: 'Close' }));

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        await user.click(thumbnail);
        await user.keyboard('{Escape}');

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('opens the full image in a dialog when the thumbnail is pressed', async () => {
        const user = userEvent.setup();
        const media = makeAttachment();

        render(<PostImage media={media} />);

        await user.click(
            screen.getByRole('button', {
                name: `Attached image: ${media.filename}`,
            }),
        );

        const dialog = screen.getByRole('dialog');
        const full = screen.getAllByRole('img', {
            name: `Attached image: ${media.filename}`,
        });

        expect(dialog).toBeInTheDocument();
        expect(
            full.some((image) => image.getAttribute('src') === media.fullUrl),
        ).toBe(true);
    });

    /**
     * The `width` and `height` attributes carry the file's real dimensions,
     * and left to themselves they fix the rendered size -- the dialog would
     * show a 3000px image at 3000px. Both axes are still taken off the image;
     * what changed is who bounds them. Below `md` the box does, so the
     * picture fills the viewer; at `md` and up the image does, so the panel
     * is sized to it. Either way the attributes are not what decides.
     */
    it('never renders the opened image at its intrinsic size', async () => {
        const user = userEvent.setup();
        const media = makeAttachment();

        render(<PostImage media={media} />);

        await user.click(
            screen.getByRole('button', {
                name: `Attached image: ${media.filename}`,
            }),
        );

        const opened = screen
            .getAllByRole('img', { name: `Attached image: ${media.filename}` })
            .find((image) => image.getAttribute('src') === media.fullUrl);

        expect(opened).toHaveClass('object-contain');
        expect(opened?.className).toMatch(/md:max-h-\[min\(82vh,/);
        expect(opened?.className).not.toMatch(/(^|\s)h-auto(\s|$)/);
    });

    it('sizes the dialog to the image rather than to a fixed column', async () => {
        const user = userEvent.setup();
        const media = makeAttachment();

        render(<PostImage media={media} />);

        await user.click(
            screen.getByRole('button', {
                name: `Attached image: ${media.filename}`,
            }),
        );

        /* Sized from the file rather than fitted to it: fitting a panel to
           an image while the image is bounded by that panel is a circle, and
           it resolved to a 698px panel holding a 964px picture. The width is
           the file's own, bounded by the viewport and by what the height cap
           implies through the ratio. */
        expect(screen.getByRole('dialog').className).toMatch(
            /md:w-\[min\(94vw,var\(--file-w\),calc\(82vh\*var\(--file-ratio\)\)\)\]/,
        );
    });

    it('is reachable and operable from the keyboard', async () => {
        const user = userEvent.setup();
        const media = makeAttachment();

        render(<PostImage media={media} />);

        await user.tab();

        expect(
            screen.getByRole('button', {
                name: `Attached image: ${media.filename}`,
            }),
        ).toHaveFocus();

        await user.keyboard('{Enter}');

        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    /**
     * The whole argument for the cover. Blurring an image the browser already
     * downloaded conceals nothing: the bytes arrived, 4chan saw the request,
     * and the filter is one devtools toggle away. So a covered attachment has
     * no `<img>` at all until an anon asks for it.
     */
    describe('concealment', () => {
        it.each([
            ['spoiler', 'Show spoiler'],
            ['mature', 'Show image'],
        ] as const)(
            'requests nothing for a %s attachment until it is revealed',
            async (concealed, action) => {
                const user = userEvent.setup();
                const media = makeAttachment({ concealed });

                render(<PostImage media={media} />);

                expect(screen.queryByRole('img')).not.toBeInTheDocument();

                await user.click(screen.getByRole('button', { name: action }));

                expect(
                    screen.getByRole('img', {
                        name: `Attached image: ${media.filename}`,
                    }),
                ).toHaveAttribute('src', media.fullUrl);
            },
        );

        it('names why it is covered rather than hiding it silently', () => {
            render(
                <PostImage media={makeAttachment({ concealed: 'mature' })} />,
            );

            expect(screen.getByText('Not worksafe')).toBeInTheDocument();
        });

        it('distinguishes a spoiler from a mature board', () => {
            render(
                <PostImage media={makeAttachment({ concealed: 'spoiler' })} />,
            );

            expect(screen.getByText('Spoilered')).toBeInTheDocument();
            expect(screen.queryByText('Not worksafe')).not.toBeInTheDocument();
        });

        /**
         * The cover briefly took the image's intrinsic height, which reserved
         * 2000px of empty box for a 3000x2000 attachment. It also leaked the
         * dimensions of something an anon had not agreed to see: how large a
         * placeholder is should say nothing about what it covers.
         */
        it('is a modest fixed band, not sized to the file behind it', () => {
            const media = makeAttachment({
                concealed: 'mature',
                width: 3000,
                height: 2000,
            });

            const { container } = render(<PostImage media={media} />);

            const cover = container.querySelector(
                '[data-slot="post-image-cover"]',
            );

            expect(cover).toHaveClass('min-h-[180px]');
            expect(cover).not.toHaveAttribute('style');
        });

        it('still reports what the file is while covered', () => {
            const media = makeAttachment({ concealed: 'spoiler' });

            render(<PostImage media={media} />);

            expect(screen.getByText(media.label)).toBeInTheDocument();
        });
    });

    /**
     * A pruned file still has a `tim`, so the URL is well-formed and the
     * request 404s. Ordinary on an imageboard rather than exceptional.
     */
    it('falls back to the labelled placeholder when the image fails to load', () => {
        const media = makeAttachment();

        render(<PostImage media={media} />);

        fireEvent.error(
            screen.getByRole('img', {
                name: `Attached image: ${media.filename}`,
            }),
        );

        expect(
            screen.getByLabelText(`Attachment: ${media.label}`),
        ).toBeInTheDocument();
    });
});

/**
 * The shapes an imageboard actually carries, run against the rules that make
 * an overflow impossible.
 *
 * Every visual bug this component has had came from one of these files
 * meeting one of those rules: a 1170x1151 tweet screenshot ran 208px off a
 * 438px screen because the panel's column sized itself to the picture; a
 * 1440x1080 photograph was clipped on a desktop because an inline cap beat
 * the breakpoint's own; a 96px reaction image filled a phone because the fill
 * had no ceiling.
 *
 * jsdom cannot measure a box, so these are contracts rather than
 * measurements -- they assert the rules hold for every shape, not the pixels
 * that follow. The pixels were checked in a browser at 390, 424, 438 and
 * 1440, and those numbers are in the commit messages rather than here, where
 * they would rot.
 */
describe('PostImage, across the shapes a board carries', () => {
    const SHAPES = [
        ['a square thumbnail', 96, 96],
        ['a tweet screenshot', 1170, 1151],
        ['a wide photograph', 1440, 1080],
        ['a tall screenshot', 500, 6000],
        ['a panorama', 6000, 500],
        ['a file that never measured', null, null],
    ] as const;

    it.each(SHAPES)(
        'opens %s without letting the file size the panel below `md`',
        async (_label, width, height) => {
            const user = userEvent.setup();
            const media = makeAttachment({ width, height });

            render(<PostImage media={media} />);

            await user.click(
                screen.getByRole('button', {
                    name: `Attached image: ${media.filename}`,
                }),
            );

            const panel = screen.getByRole('dialog');
            const full = screen
                .getAllByRole('img', {
                    name: `Attached image: ${media.filename}`,
                })
                .at(-1);
            const row = full?.parentElement;

            /* The column is a definite share of the panel. An implicit `auto`
               column sizes to its content, and the content is an image that
               asks for its own width. */
            expect(panel).toHaveClass('grid-cols-1');

            /* The rows may shrink below their content. A grid item's minimum
               is `auto` -- its content's intrinsic size -- which is the same
               default that overflowed four container queries in task 1. */
            expect(row).toHaveClass('min-w-0');
            expect(row).toHaveClass('overflow-hidden');

            /* Below `md` the box bounds the image, never the file: the panel
               is the whole screen there, so a file-derived cap is no cap. */
            expect(full).toHaveClass('max-w-full');
            expect(full).toHaveClass('max-h-full');
            expect(full?.className).not.toMatch(/(^|\s)max-w-\[var/);

            /* At `md` and up the bound is the viewport and the file, applied
               as classes so each breakpoint can still override -- an inline
               declaration would win over all of them. */
            expect(full?.className).toMatch(/md:max-h-\[min\(82vh,/);
            expect(full?.style.maxWidth).toBe('');
            expect(full?.style.maxHeight).toBe('');

            /* Proportions are never distorted, whatever the shape. */
            expect(full).toHaveClass('object-contain');
        },
    );

    it.each(SHAPES)(
        'crops %s to a uniform feed row rather than setting the row height',
        (_label, width, height) => {
            render(
                <PostImage
                    media={makeAttachment({ width, height })}
                    variant="card"
                />,
            );

            const box = screen.getByRole('button');

            /* A feed is a grid of equal rows: the ratio is fixed and the
               picture is cropped into it, so a 6000px-tall file cannot set
               the height of the row it sits in. */
            expect(box).toHaveClass('aspect-[16/9]');
            expect(box).toHaveClass('max-w-(--measure-media)');
            expect(screen.getByRole('img')).toHaveClass('object-cover');
        },
    );
});

describe('PostAttachment', () => {
    it('renders nothing for a post with no file', () => {
        const { container } = render(<PostAttachment media={null} />);

        expect(container).toBeEmptyDOMElement();
    });

    it('renders the image for a post that has one', () => {
        const media = makeAttachment();

        render(<PostAttachment media={media} />);

        expect(
            screen.getByRole('img', {
                name: `Attached image: ${media.filename}`,
            }),
        ).toBeInTheDocument();
    });
});
