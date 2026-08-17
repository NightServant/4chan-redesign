import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ResultThumbnail } from '@/components/clover/result-thumbnail';
import { makeAttachment } from '@/fixtures/factories';

describe('ResultThumbnail', () => {
    /**
     * 4chan's thumbnail is 250px on the long side, which is useless at full
     * width and exactly right in an 88px square. This is the one place the
     * `thumbnailUrl` the resource has always carried is the correct source.
     */
    it('loads the thumbnail rather than the original', () => {
        render(<ResultThumbnail media={makeAttachment()} />);

        const image = screen.getByRole('presentation');

        expect(image).toHaveAttribute(
            'src',
            'https://i.4cdn.org/g/1745612650141704s.jpg',
        );
        expect(image).toHaveAttribute('loading', 'lazy');
        expect(image).toHaveAttribute('referrerpolicy', 'no-referrer');
    });

    /**
     * A covered attachment is never requested. Blurring bytes the browser has
     * already fetched conceals nothing, which is why `PostImage` withholds the
     * `src` too -- one rule, applied wherever an attachment is drawn.
     */
    it.each(['spoiler', 'mature'] as const)(
        'requests nothing at all when the attachment is %s',
        (concealed) => {
            const { container } = render(
                <ResultThumbnail media={makeAttachment({ concealed })} />,
            );

            expect(container.querySelector('img')).toBeNull();
            expect(screen.getByRole('img')).toHaveAccessibleName(/hidden/i);
        },
    );

    it('renders nothing when there is no attachment', () => {
        const { container } = render(<ResultThumbnail media={null} />);

        expect(container).toBeEmptyDOMElement();
    });
});
