import { ExternalLink, EyeIcon } from 'lucide-react';
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
 * Where an attachment is being drawn, which decides how large it may draw.
 *
 * `card` is a thread in a list; `post` is a thread being read. Both fetch the
 * file itself and differ only in how much room it is given.
 *
 * Neither uses the thumbnail, which is the part worth explaining. 4chan caps
 * thumbnails at 250px on the long side for an OP and **125px for a reply**,
 * measured across the ingested rows — a reply thumbnail is smaller than the
 * avatar beside it. Scaling one to a readable width is a 125px image stretched
 * threefold, which is blur rather than detail, and there is no intermediate
 * rendition to ask for: upstream offers the thumbnail or the original and
 * nothing in between. So the original is what loads, held to a sane size by
 * the caps below.
 *
 * That is affordable only because every image is lazy. A feed loads the two or
 * three attachments actually on screen, not all thirty.
 */
type PostImageVariant = 'card' | 'post';

/**
 * The box the image occupies before it arrives.
 *
 * The file's own dimensions, so the browser reserves the correct aspect ratio
 * and nothing shifts as it loads. Handing it the thumbnail's dimensions while
 * loading the original would reserve the wrong shape and reintroduce exactly
 * the shift this prevents.
 */
function intrinsicBox(media: Attachment): {
    width: number | undefined;
    height: number | undefined;
} {
    return {
        width: media.width ?? undefined,
        height: media.height ?? undefined,
    };
}

/**
 * The accessible name for an attachment.
 *
 * It was the bare filename, which on 4chan is very often `1712345678901.jpg` —
 * a timestamp read out digit by digit, telling a screen-reader user nothing
 * about what the element is or why it is there. Naming the role first fixes
 * that: "Attached image" is the useful part, the filename is the identifying
 * part, and it is still the only text the source actually gives us.
 *
 * No description of the *contents* is generated. Clover does not know what is
 * in the picture, and an alt attribute that guesses is worse than one that is
 * merely terse — the rule that keeps invented figures off the boards applies
 * to invented descriptions too.
 */
function altFor(media: Attachment): string {
    return `Attached image: ${media.filename}`;
}

/**
 * The width the box stops at, whatever the column happens to be.
 *
 * Gabe, 2026-08-17: "Some of the images in larger screens felt too much wide."
 * The reading column is 760px, and 840px past 1536px, so a full-bleed
 * attachment was the widest element on the page by a wide margin — it read as
 * a banner rather than as one part of a post. The box takes the column up to
 * this and stops.
 *
 * Unprefixed on purpose. This is a cap on the box, not a phone accommodation,
 * so it holds at 390 and at 2545 alike; a `md:`-gated version would be exactly
 * the half-measure the request was about.
 */
const MAX_BOX_WIDTH = 'max-w-[560px]';

/**
 * The box each variant draws, and the image inside it.
 *
 * **`card` is a fixed, cover-cropped box.** A feed is a uniform grid, and a
 * 400x4000 infographic must not be allowed to set the height of the row it
 * happens to land in — under a height cap alone it still varied every row by
 * however tall it was under that cap. A fixed ratio makes every row the same
 * row, and cropping is what fills it.
 *
 * `object-top`, not the default centre. An OP's subject is nearly always at the
 * top of the file — the screenshot's window, the panel, the face — and
 * centre-cropping a tall image is precisely what loses it. Anchoring the crop
 * to the top keeps the part that was the reason for posting.
 *
 * **`post` is unchanged and uncropped.** The thread page is where the file is
 * actually being looked at, so it is contained under a height cap and shown
 * whole. Only the width cap above applies to both, because that one is about
 * the box's place on the page rather than about what may be cut off.
 *
 * Either way, opening the attachment shows it whole at full size.
 *
 * ## Why only the post box is centred, and why with `self-center`
 *
 * The cap above is a `max-width`, and a box narrower than its container hugs
 * the leading edge unless it is told otherwise. On the thread page that put
 * roughly 300px of empty column to the right of the image while the post's
 * header, title and footer all ran the full width — the image read as having
 * failed to load the rest of itself.
 *
 * `self-center`, not `mx-auto`: every parent this variant has is a
 * `flex flex-col` (`thread/original-post.tsx` and `clover/comment-tree.tsx`),
 * so horizontal placement here is cross-axis alignment and `align-self` is the
 * property that decides it — an auto margin only reaches the same result by
 * being allowed to override the container's `align-items`. One rule, named
 * after the thing it does; `mx-auto` is deliberately not also present, because
 * two rules for one job leaves nobody able to tell which is load-bearing.
 *
 * Nothing else about the variant changes: no upscaling to fill the column, no
 * crop and no fixed ratio. A 557px image blown up to 857px is worse than a gap.
 *
 * The card box is deliberately left where it is. A feed row's image sits under
 * that row's title and stats, and aligning it to their leading edge is what
 * makes it read as part of the row rather than as a centred illustration.
 */
const VARIANT_BOX_CLASSES: Record<PostImageVariant, string> = {
    card: `aspect-[4/3] ${MAX_BOX_WIDTH}`,
    /* No cap. The thread column already caps itself at
       `--measure-column`, so a second 560px cap inside it left the image
       fixed while the column grew -- the gap Gabe kept seeing. The image
       takes the column and stops at its own natural size. */
    post: 'w-full',
};

const VARIANT_IMAGE_CLASSES: Record<PostImageVariant, string> = {
    card: 'h-full w-full object-cover object-top',
    post: 'h-auto max-h-[720px] w-full object-contain',
};

type PostImageProps = {
    media: Attachment;
    /** Defaults to `card`, the tighter cap. */
    variant?: PostImageVariant;
    className?: string;
};

function PostImage({ media, variant = 'card', className }: PostImageProps) {
    /* Concealment is the initial state, not a permanent one: revealing is a
       per-attachment decision an anon makes and it does not persist. */
    const [revealed, setRevealed] = useState(media.concealed === null);
    const [expanded, setExpanded] = useState(false);
    const [failed, setFailed] = useState(false);

    const box = intrinsicBox(media);

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
                className={cn(
                    /* A fixed, modest band, sized to its own copy rather than
                       to the file behind it. It briefly took the image's
                       intrinsic height, which reserved 2000px of empty box for
                       a 3000x2000 attachment — and would have leaked the
                       dimensions of something an anon has not agreed to see.
                       A cover is a placeholder; how large it is says nothing
                       about what it covers. */
                    'flex min-h-[180px] w-full flex-col items-center justify-center gap-2 rounded-lg border border-border bg-surface-elevated p-6 text-center',
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
                    /* Full width too: an image that fills its box is still
                       inset if the box itself does not fill the column. */
                    'group block w-full overflow-hidden rounded-lg border border-border bg-surface-elevated',
                    VARIANT_BOX_CLASSES[variant],
                    'transition-colors duration-[var(--duration-hover)] ease-standard hover:border-border-strong',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    className,
                )}
            >
                <img
                    src={media.fullUrl}
                    alt={altFor(media)}
                    width={box.width}
                    height={box.height}
                    loading="lazy"
                    decoding="async"
                    /* 4chan sees the request either way; sending no referrer
                       at least keeps which page an anon was reading out of it. */
                    referrerPolicy="no-referrer"
                    onError={() => setFailed(true)}
                    className={cn('block', VARIANT_IMAGE_CLASSES[variant])}
                />
            </button>

            <Dialog open={expanded} onOpenChange={setExpanded}>
                {/* The whole screen on a phone, a panel on a desktop.
                
                    It was a centred card at every width, which on a phone
                    gave the file *less* room than the thread page had already
                    given it and put the only way out in a corner as a 24px
                    cross. Below `md` it fills the viewport: the image takes
                    the middle, and the controls sit in a bar at the bottom
                    where a thumb is. At `md` and up the panel comes back,
                    sized to the image rather than to a fixed column, so a
                    portrait shot is not boxed in a landscape frame. */}
                <DialogContent className="grid h-dvh w-screen max-w-none grid-rows-[auto_1fr_auto] gap-0 rounded-none border-0 bg-bg p-0 sm:max-w-none md:h-auto md:w-fit md:max-w-[min(94vw,1400px)] md:rounded-2xl md:border md:p-6">
                    <DialogTitle className="sr-only">
                        {media.filename}
                    </DialogTitle>

                    {/* The file's name, and room for the close control
                        `DialogContent` draws in the corner. One way out, not
                        two: a second close button of our own would have sat
                        beside the built-in one at every width, and the built-in
                        one now carries a 44px hit area of its own. */}
                    <div className="flex items-center border-b border-border px-3 py-3 pr-14 md:hidden">
                        <MachineValue className="min-w-0 truncate text-faint">
                            {media.filename}
                        </MachineValue>
                    </div>

                    <div className="flex min-h-0 items-center justify-center overflow-hidden p-2 md:p-0">
                        <img
                            src={media.fullUrl}
                            alt={altFor(media)}
                            width={media.width ?? undefined}
                            height={media.height ?? undefined}
                            referrerPolicy="no-referrer"
                            onError={() => {
                                setFailed(true);
                                setExpanded(false);
                            }}
                            /* Both axes automatic, bounded by the box it sits
                               in. The `width` and `height` attributes above
                               are the file's real dimensions and would
                               otherwise fix the rendered size, so `h-auto
                               w-auto` is what hands the proportions back to
                               the image. */
                            className="h-auto max-h-full w-auto max-w-full rounded-md object-contain md:max-h-[82vh]"
                        />
                    </div>

                    {/* The bottom bar. Every control in it is a real touch
                        target rather than a line of small print: `label` is
                        the file's own size and dimensions, and the link is
                        the file itself on 4chan's CDN, which is the one
                        action this component has any source for. Bookmarking
                        and sharing belong to the post, not to its
                        attachment, and this component has never been given
                        one. */}
                    <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2 md:mt-4 md:justify-center md:border-0 md:py-0">
                        <MachineValue className="min-w-0 truncate text-faint">
                            {media.label}
                        </MachineValue>

                        <a
                            href={media.fullUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            referrerPolicy="no-referrer"
                            className="touch-target-44 inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-body-sm text-muted-foreground hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:hidden"
                        >
                            <ExternalLink
                                aria-hidden="true"
                                className="size-4"
                            />
                            Original file
                        </a>
                    </div>
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
    variant,
    className,
}: {
    media: Attachment | null;
    variant?: PostImageVariant;
    className?: string;
}) {
    if (media === null) {
        return null;
    }

    return <PostImage media={media} variant={variant} className={className} />;
}

export { PostAttachment, PostImage };
export type { PostImageProps, PostImageVariant };
