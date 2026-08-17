import { ImageOffIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Attachment } from '@/types/clover';

/**
 * An attachment at the trailing edge of a search result row.
 *
 * This is the one place `Attachment.thumbnailUrl` is the right source. 4chan
 * caps a thumbnail at 250px on the long side, which is why `PostImage` loads
 * the original instead — a 125px reply thumbnail stretched to a column is
 * blur. In an 88px square it is exactly the right file, and a results page of
 * forty rows fetches forty small images rather than forty originals.
 *
 * A covered attachment is never requested. There is no `src` and no reveal
 * control here: a search row is not the place to agree to see something, and
 * blurring bytes the browser has already fetched conceals nothing. The row
 * says an attachment is there and hidden, and the thread page is where it can
 * be opened.
 *
 * Decorative for assistive tech. The row's own link already names the thread
 * or the reply, and Clover does not know what is in the picture — an alt
 * attribute that guessed would be the invented-figure rule in another
 * costume.
 */
type ResultThumbnailProps = {
    media: Attachment | null;
    className?: string;
};

const boxClassName =
    'size-22 shrink-0 overflow-hidden rounded-md border border-border bg-surface-elevated';

function ResultThumbnail({ media, className }: ResultThumbnailProps) {
    if (media === null) {
        return null;
    }

    if (media.concealed !== null) {
        return (
            <div
                data-slot="result-thumbnail-cover"
                role="img"
                aria-label={
                    media.concealed === 'spoiler'
                        ? 'Attachment hidden: marked a spoiler'
                        : 'Attachment hidden: not worksafe'
                }
                className={cn(
                    boxClassName,
                    'grid place-items-center',
                    className,
                )}
            >
                <ImageOffIcon
                    aria-hidden="true"
                    className="size-5 text-faint"
                />
            </div>
        );
    }

    return (
        <img
            data-slot="result-thumbnail"
            src={media.thumbnailUrl}
            /* Decorative: named by the row it belongs to. `role` is explicit
               because an empty `alt` alone leaves the element out of the
               accessibility tree in some engines, and a test that cannot see
               it cannot prove the concealed case renders no image at all. */
            alt=""
            role="presentation"
            loading="lazy"
            decoding="async"
            /* 4chan sees the request either way; sending no referrer keeps
               which page an anon was reading out of it. */
            referrerPolicy="no-referrer"
            className={cn(boxClassName, 'object-cover', className)}
        />
    );
}

export { ResultThumbnail };
export type { ResultThumbnailProps };
