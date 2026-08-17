import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PostAttachment, PostImage } from '@/components/clover/post-image';
import { makeAttachment } from '@/fixtures/factories';

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
     * The image fills the column, which is what stops a ragged margin down
     * one side of the feed. Sizing from the height cap instead leaves every
     * landscape image short of the right edge by however much its aspect
     * ratio happens to differ.
     */
    it.each(['card', 'post'] as const)(
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

        expect(screen.getByRole('button')).toHaveClass('aspect-[4/3]');
        expect(screen.getByRole('img')).not.toHaveClass('max-h-[520px]');

        unmount();

        render(<PostImage media={media} variant="post" />);

        expect(screen.getByRole('button')).not.toHaveClass('aspect-[4/3]');
        expect(screen.getByRole('img')).toHaveClass('max-h-[720px]');
    });

    it('defaults to the card variant, the cropped box', () => {
        render(<PostImage media={makeAttachment()} />);

        expect(screen.getByRole('button')).toHaveClass('aspect-[4/3]');
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
            expect(tallBox).toContain('aspect-[4/3]');
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
        it('caps the width of a card box', () => {
            render(<PostImage media={makeAttachment()} variant="card" />);

            expect(screen.getByRole('button')).toHaveClass('max-w-[560px]');
        });

        it('lets a post box take its column', () => {
            render(<PostImage media={makeAttachment()} variant="post" />);

            const box = screen.getByRole('button');

            expect(box).toHaveClass('w-full');
            expect(box.className).not.toMatch(/max-w-\[560px\]/);
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
     * The `width` and `height` attributes carry the file's real dimensions, so
     * without both axes set to automatic they fix the rendered size and the
     * dialog shows a 3000px image at 3000px. Automatic on both, bounded by the
     * viewport, is what hands the proportions back to the image.
     */
    it('lets the opened image size itself on both axes', async () => {
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

        expect(opened).toHaveClass('h-auto');
        expect(opened).toHaveClass('w-auto');
        expect(opened).toHaveClass('object-contain');
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

        expect(screen.getByRole('dialog').className).toMatch(/md:w-fit/);
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
