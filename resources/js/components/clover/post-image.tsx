import { EyeIcon } from 'lucide-react';
import { useState } from 'react';
import { MachineValue } from '@/components/clover/machine-value';
import { MediaPlaceholder } from '@/components/clover/media-placeholder';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { Attachment } from '@/types/clover';

/**
 * A post's attachment: thumbnail inline, full image in a dialog.
 *
 * The thumbnail is a few kilobytes and the original can be four megabytes, so
 * a feed of thirty threads loads thumbnails and nothing else. The full file is
 * fetched when an anon asks for it and not before.
 *
 * **A concealed attachment never gets a `src`.** Blurring an image the browser
 * has already downloaded conceals nothing — the bytes are there, the request
 * happened, and the filter is one devtools toggle away. So a covered
 * attachment renders as a box with its label and a reveal control, and the
 * `<img>` does not exist until it is pressed. That also means a spoilered or
 * adult-board image costs no request from an anon who scrolls past it.
 *
 * `concealed` arrives decided by the server. It is a reason, not a hint: the
 * client is never handed a URL plus a suggestion to hide it.
 */

/** What the cover says, and what the button offers to do about it. */
const CONCEALMENT_COPY = {
    spoiler: {
        title: 'Spoilered',
        body: 'The anon who posted this marked it a spoiler.',
        action: 'Show spoiler',
    },
    mature: {
        title: 'Not worksafe',
        body: 'This board is marked not worksafe. Nothing is loaded until you ask.',
        action: 'Show image',
    },
} as const;

/**
 * The box the thumbnail occupies before it arrives.
 *
 * 4chan reports the thumbnail's own dimensions, so the space is reserved
 * rather than guessed. Without this every image in a feed shifts the page as
 * it loads, which is the layout-shift version of inventing a number.
 */
function thumbnailBox(media: Attachment): {
    width: number | undefined;
    height: number | undefined;
} {
    return {
        width: media.thumbWidth ?? undefined,
        height: media.thumbHeight ?? undefined,
    };
}

type PostImageProps = {
    media: Attachment;
    className?: string;
};

function PostImage({ media, className }: PostImageProps) {
    /* Concealment is the initial state, not a permanent one: revealing is a
       per-attachment decision an anon makes and it does not persist. */
    const [revealed, setRevealed] = useState(media.concealed === null);
    const [expanded, setExpanded] = useState(false);
    const [failed, setFailed] = useState(false);

    const box = thumbnailBox(media);

    /**
     * A file 4chan has since pruned still has a `tim`, so the URL is
     * well-formed and the request 404s. That is ordinary on an imageboard
     * rather than exceptional, so it falls back to the labelled placeholder
     * the whole app used before images rendered at all.
     */
    if (failed) {
        return <MediaPlaceholder label={media.label} className={className} />;
    }

    if (!revealed && media.concealed !== null) {
        const copy = CONCEALMENT_COPY[media.concealed];

        return (
            <div
                data-slot="post-image-cover"
                style={{ minHeight: box.height }}
                className={cn(
                    'flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-surface-elevated p-6 text-center',
                    className,
                )}
            >
                <p className="text-body-sm font-medium text-foreground">
                    {copy.title}
                </p>
                <p className="max-w-prose text-meta text-muted-foreground">
                    {copy.body}
                </p>
                <MachineValue className="text-faint">
                    {media.label}
                </MachineValue>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRevealed(true)}
                    className="mt-1"
                >
                    <EyeIcon aria-hidden="true" className="size-3.5" />
                    {copy.action}
                </Button>
            </div>
        );
    }

    return (
        <>
            {/* The thumbnail is the button. Wrapping an image in a button
                rather than giving the image an onClick is what makes it
                keyboard reachable and gives it a real accessible name. */}
            <button
                type="button"
                data-slot="post-image"
                onClick={() => setExpanded(true)}
                className={cn(
                    'group block overflow-hidden rounded-lg border border-border bg-surface-elevated',
                    'transition-colors duration-[var(--duration-hover)] ease-standard hover:border-border-strong',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    className,
                )}
            >
                <img
                    src={media.thumbnailUrl}
                    alt={media.filename}
                    width={box.width}
                    height={box.height}
                    loading="lazy"
                    decoding="async"
                    /* 4chan sees the request either way; sending no referrer
                       at least keeps which page an anon was reading out of it. */
                    referrerPolicy="no-referrer"
                    onError={() => setFailed(true)}
                    className="block h-auto max-w-full object-cover"
                />
            </button>

            <Dialog open={expanded} onOpenChange={setExpanded}>
                <DialogContent className="max-w-[min(92vw,1100px)] sm:max-w-[min(92vw,1100px)]">
                    <DialogTitle className="sr-only">
                        {media.filename}
                    </DialogTitle>

                    <img
                        src={media.fullUrl}
                        alt={media.filename}
                        width={media.width ?? undefined}
                        height={media.height ?? undefined}
                        referrerPolicy="no-referrer"
                        onError={() => {
                            setFailed(true);
                            setExpanded(false);
                        }}
                        className="max-h-[75vh] w-auto max-w-full self-center rounded-md object-contain"
                    />

                    <MachineValue className="text-center text-faint">
                        {media.label}
                    </MachineValue>
                </DialogContent>
            </Dialog>
        </>
    );
}

/**
 * The attachment for a post, or nothing when it has none.
 *
 * A wrapper rather than a null check at every call site: most posts have no
 * file, and four components would otherwise each repeat the same conditional.
 */
function PostAttachment({
    media,
    className,
}: {
    media: Attachment | null;
    className?: string;
}) {
    if (media === null) {
        return null;
    }

    return <PostImage media={media} className={className} />;
}

export { PostAttachment, PostImage };
export type { PostImageProps };
