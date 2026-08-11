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

            const image = screen.getByRole('img', { name: media.filename });

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
     * An aspect ratio alone does not stop a 1920x4000 infographic taking over
     * the page, so each variant is capped — a card tighter than a post, being
     * one item in a list rather than the thing being read.
     */
    it('caps a card tighter than a post', () => {
        const media = makeAttachment();

        const { unmount } = render(<PostImage media={media} variant="card" />);

        expect(screen.getByRole('img')).toHaveClass('max-h-[460px]');

        unmount();

        render(<PostImage media={media} variant="post" />);

        expect(screen.getByRole('img')).toHaveClass('max-h-[640px]');
    });

    it('defaults to the card variant, the tighter cap', () => {
        render(<PostImage media={makeAttachment()} />);

        expect(screen.getByRole('img')).toHaveClass('max-h-[460px]');
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

    it('opens the full image in a dialog when the thumbnail is pressed', async () => {
        const user = userEvent.setup();
        const media = makeAttachment();

        render(<PostImage media={media} />);

        await user.click(screen.getByRole('button', { name: media.filename }));

        const dialog = screen.getByRole('dialog');
        const full = screen.getAllByRole('img', { name: media.filename });

        expect(dialog).toBeInTheDocument();
        expect(
            full.some((image) => image.getAttribute('src') === media.fullUrl),
        ).toBe(true);
    });

    it('is reachable and operable from the keyboard', async () => {
        const user = userEvent.setup();
        const media = makeAttachment();

        render(<PostImage media={media} />);

        await user.tab();

        expect(
            screen.getByRole('button', { name: media.filename }),
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
                    screen.getByRole('img', { name: media.filename }),
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

        fireEvent.error(screen.getByRole('img', { name: media.filename }));

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
            screen.getByRole('img', { name: media.filename }),
        ).toBeInTheDocument();
    });
});
