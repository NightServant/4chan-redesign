import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PostAttachment, PostImage } from '@/components/clover/post-image';
import { makeAttachment } from '@/fixtures/factories';

describe('PostImage', () => {
    it('renders the thumbnail, not the full image', () => {
        const media = makeAttachment();

        render(<PostImage media={media} />);

        const image = screen.getByRole('img', { name: media.filename });

        expect(image).toHaveAttribute('src', media.thumbnailUrl);
        expect(image).not.toHaveAttribute('src', media.fullUrl);
    });

    /**
     * A feed of thirty cards each pulling a four-megabyte original is the
     * difference between a page that loads and one that does not.
     */
    it('lazy-loads the thumbnail and reserves its box', () => {
        const media = makeAttachment({ thumbWidth: 250, thumbHeight: 156 });

        render(<PostImage media={media} />);

        const image = screen.getByRole('img', { name: media.filename });

        expect(image).toHaveAttribute('loading', 'lazy');
        expect(image).toHaveAttribute('width', '250');
        expect(image).toHaveAttribute('height', '156');
    });

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
                ).toHaveAttribute('src', media.thumbnailUrl);
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
