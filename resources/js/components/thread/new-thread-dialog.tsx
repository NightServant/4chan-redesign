import { TriangleAlert, X } from 'lucide-react';
import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { FormField } from '@/components/clover/form-field';
import { MachineValue } from '@/components/clover/machine-value';
import { MediaPlaceholder } from '@/components/clover/media-placeholder';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { POST_MAX_LENGTH } from '@/lib/posting';
import { cn } from '@/lib/utils';
import type { BoardSlug } from '@/types/clover';

/**
 * A picked file gives an honest name and an honest byte count. It does not
 * give pixel dimensions without decoding the file, and decoding an arbitrary
 * upload just to print a number is its own can of worms: async, format
 * dependent, and it needs an object URL cleaned up afterwards. Printing name
 * and size and leaving dimensions out is "media is never invented" applied
 * to a value this control cannot measure honestly, not a shortcut.
 */
function formatFileSize(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    const units = ['KB', 'MB', 'GB'] as const;
    let value = bytes / 1024;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }

    return `${value.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * One board an anon can start a thread on.
 *
 * Carries its own `maxCommentChars` rather than the dialog taking a single
 * limit prop, because this dialog is the one composer where the board is
 * chosen *inside* it. 4chan's limit is per board — 2000, 3000 or 5000 — so a
 * single number handed down at mount is wrong the moment the picker changes,
 * which is precisely the bug that deleting the global constant was meant to
 * end rather than relocate.
 *
 * Deliberately not `Board`: this control needs a slug, a name and a limit, and
 * has no use for a thread count it would then have to be given.
 */
export interface NewThreadBoardOption {
    slug: BoardSlug;
    name: string;
    /** The board's own `max_comment_chars`, from `boards.json`. */
    maxCommentChars: number;
}

export interface NewThreadPost {
    board: BoardSlug;
    subject: string;
    body: string;
    attachment: File | null;
}

export interface NewThreadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /**
     * The boards an anon may post to, in the order they should be offered.
     * Supplied by the page: this component used to read the design fixtures
     * directly, which meant it offered seven hardcoded boards no matter what
     * the router or the database actually knew about.
     */
    boards: readonly NewThreadBoardOption[];
    /** Preselects a board, e.g. when opened from that board's own page. */
    defaultBoard?: BoardSlug;
    /** Fires with the composed thread when Post thread is activated. */
    onPost?: (thread: NewThreadPost) => void;
}

type NewThreadDialogContentProps = Omit<NewThreadDialogProps, 'open'>;

/**
 * Holds every field's state. Mounted fresh each time the dialog opens (see
 * the `key` on its usage below), which is what gives every open a blank
 * compose without a previous draft leaking through: the alternative, an
 * effect that resets state when `open` flips to true, sets state during
 * render's aftermath for no external reason and is the pattern React's own
 * docs steer away from in favour of remounting.
 */
function NewThreadDialogContent({
    boards,
    onOpenChange,
    defaultBoard,
    onPost,
}: NewThreadDialogContentProps) {
    const [board, setBoard] = useState<BoardSlug | undefined>(
        defaultBoard ?? boards[0]?.slug,
    );
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [attachment, setAttachment] = useState<File | null>(null);
    const [fileInputKey, setFileInputKey] = useState(0);

    /**
     * The limit follows the picker. A `defaultBoard` the caller passed that is
     * not in `boards` leaves nothing to read a limit from, so the shared
     * fallback covers it: the lowest of the three real values, which errs
     * towards warning an anon early rather than late.
     */
    const maxCommentChars =
        boards.find((option) => option.slug === board)?.maxCommentChars ??
        POST_MAX_LENGTH;

    const trimmedBody = body.trim();
    const overLimit = body.length > maxCommentChars;
    const canSubmit =
        board !== undefined && trimmedBody.length > 0 && !overLimit;

    function handleAttachmentChange(event: ChangeEvent<HTMLInputElement>) {
        setAttachment(event.target.files?.[0] ?? null);
    }

    function clearAttachment() {
        setAttachment(null);
        // Native file inputs are uncontrolled: remounting via key is what
        // resets the browser's own "no file chosen" state alongside ours.
        setFileInputKey((key) => key + 1);
    }

    function handlePost() {
        if (!canSubmit || board === undefined) {
            return;
        }

        onPost?.({ board, subject, body: trimmedBody, attachment });
        onOpenChange(false);
    }

    return (
        <DialogContent className="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle>New thread</DialogTitle>
                <DialogDescription>
                    Every thread needs a board and a body. A subject and an
                    attachment are optional.
                </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
                <FormField label="Board">
                    {(control) => (
                        <Select
                            value={board}
                            onValueChange={(value) =>
                                setBoard(value as BoardSlug)
                            }
                        >
                            <SelectTrigger
                                id={control.id}
                                aria-describedby={control['aria-describedby']}
                                aria-invalid={control['aria-invalid']}
                                className="w-full"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {boards.map((option) => (
                                    <SelectItem
                                        key={option.slug}
                                        value={option.slug}
                                    >
                                        <MachineValue>
                                            {option.slug}
                                        </MachineValue>{' '}
                                        {option.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </FormField>

                <FormField
                    label={
                        <>
                            Subject{' '}
                            <span className="font-normal text-faint">
                                (optional)
                            </span>
                        </>
                    }
                >
                    <Input
                        value={subject}
                        onChange={(event) => setSubject(event.target.value)}
                        placeholder="Add a subject"
                    />
                </FormField>

                <FormField
                    label="Body"
                    description={
                        <span className="flex items-center justify-between gap-2">
                            <span
                                className={cn(
                                    'flex items-center gap-1',
                                    overLimit && 'font-semibold text-danger',
                                )}
                            >
                                {overLimit ? (
                                    <TriangleAlert
                                        aria-hidden="true"
                                        className="size-3.5 shrink-0"
                                    />
                                ) : null}
                                {overLimit
                                    ? 'Over the limit'
                                    : 'Start a line with > for greentext.'}
                            </span>
                            <MachineValue
                                className={
                                    overLimit ? 'text-danger' : undefined
                                }
                            >
                                {body.length}/{maxCommentChars}
                            </MachineValue>
                        </span>
                    }
                >
                    <Textarea
                        required
                        value={body}
                        onChange={(event) => setBody(event.target.value)}
                        rows={6}
                    />
                </FormField>

                <FormField
                    label={
                        <>
                            Attachment{' '}
                            <span className="font-normal text-faint">
                                (optional)
                            </span>
                        </>
                    }
                >
                    <Input
                        key={fileInputKey}
                        type="file"
                        onChange={handleAttachmentChange}
                    />
                </FormField>

                {attachment ? (
                    <div className="flex items-center gap-2">
                        <MediaPlaceholder
                            label={`${attachment.name} · ${formatFileSize(attachment.size)}`}
                            height={96}
                            className="flex-1"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={clearAttachment}
                        >
                            <X aria-hidden="true" className="size-4" />
                            <span className="sr-only">Remove attachment</span>
                        </Button>
                    </div>
                ) : null}
            </div>

            <DialogFooter>
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onOpenChange(false)}
                >
                    Cancel
                </Button>
                <Button
                    type="button"
                    variant="primary"
                    disabled={!canSubmit}
                    onClick={handlePost}
                >
                    Post thread
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}

/**
 * The composer for starting a thread, opened from the header's "New thread"
 * button.
 *
 * A dialog, unlike the inline `ReplyComposer`: posting a thread picks a
 * board and commits to it, which is a deliberate detour from whatever the
 * anon was reading, not a quick aside at the foot of it.
 *
 * There is no backend. Posting hands the composed thread to `onPost` and
 * closes the dialog; nothing is persisted and no thread is appended to any
 * list here, since there is no server to reconcile that append against.
 */
function NewThreadDialog({
    open,
    onOpenChange,
    boards,
    defaultBoard,
    onPost,
}: NewThreadDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <NewThreadDialogContent
                key={open ? 'open' : 'closed'}
                boards={boards}
                onOpenChange={onOpenChange}
                defaultBoard={defaultBoard}
                onPost={onPost}
            />
        </Dialog>
    );
}

export { NewThreadDialog };
