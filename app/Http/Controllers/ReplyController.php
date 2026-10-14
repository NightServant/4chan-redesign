<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\CommentTree;
use App\Models\Attachment;
use App\Models\Post;
use App\Models\Thread;
use App\Models\User;
use App\Services\LocalPostNumbers;
use App\Support\AdvisoryLock;
use App\Support\ImageScrubber;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Replying to a thread.
 *
 * The reply is stored here and never sent anywhere: 4chan's API accepts GET,
 * HEAD and OPTIONS only, so nothing an anon writes on Clover reaches the board
 * it is reading. That is the arrangement, not a limitation to be worked around
 * — the composer says as much and this controller is what finally makes it
 * true rather than a comment.
 *
 * A local reply sits in the same table as everything ingested, so it nests
 * into the same tree, quotes the same way, and is read by the same code.
 */
class ReplyController extends Controller
{
    /**
     * The composer as its own screen, for phones.
     *
     * A reply box at the foot of a thread is right with a mouse and a full
     * window. On a phone it is a two-line textarea under two hundred comments,
     * with the keyboard taking half of what is left. This gives the field the
     * viewport, the attachment control somewhere to live, and Post somewhere a
     * thumb can reach.
     *
     * It is a second surface onto `store` below, not a second implementation:
     * same route, same validation, same numbering. The page it renders posts
     * to the route that already existed.
     */
    public function create(Request $request, string $board, string $thread): Response
    {
        $model = $this->visibleBoard($request, $board);

        $target = Thread::query()
            ->where('board_id', $model->id)
            ->where('no', (int) $thread)
            ->firstOrFail();

        return Inertia::render('reply', [
            'thread' => [
                'no' => $target->no,
                'board' => '/'.$model->slug.'/',
                /* `displayTitle`, not a second copy of its rules. A thread
                   with no subject is ordinary on an imageboard, and the model
                   already knows what a reader recognises it by: the subject,
                   else the OP's opening line, else the post number. Writing
                   that out again here is how the composer's heading and the
                   thread's would drift -- and the version written here called
                   a method `Post` does not have, which phpstan caught and the
                   feature tests did not, because they only ever built threads
                   that had a subject. */
                'title' => $target->displayTitle(),
            ],
            /**
             * The board's own limit, not the shared fallback. It is 2000,
             * 3000 or 5000 depending on where you are posting, so a counter
             * built on a constant would either stop an anon short of what the
             * server accepts or let them fill a field the request rejects.
             */
            'maxCommentChars' => $model->max_comment_chars,
        ]);
    }

    /**
     * A thread's replies as JSON, for the full-image viewer's drawer.
     *
     * The viewer opens from a feed row as well as from the thread page, and a
     * row carries no comments -- so the drawer fetches rather than the feed
     * sending every thread's tree with the page, which would be tens of
     * thousands of rows for the handful anyone opens.
     *
     * Same builder the thread page uses (`CommentTree`), so the drawer and
     * the page cannot disagree about nesting, quoting or what a reply says.
     * Public, because reading never needs an account here.
     */
    public function index(Request $request, string $board, string $thread): JsonResponse
    {
        $model = $this->visibleBoard($request, $board);

        $target = Thread::query()
            ->where('board_id', $model->id)
            ->where('no', (int) $thread)
            ->firstOrFail();

        return response()->json([
            'comments' => CommentTree::for($target),
        ]);
    }

    public function store(Request $request, string $board, string $thread): RedirectResponse
    {
        $model = $this->visibleBoard($request, $board);

        $target = Thread::query()
            ->where('board_id', $model->id)
            ->where('no', (int) $thread)
            ->firstOrFail();

        $validated = $request->validate([
            /**
             * The board's own limit, not a global one. `max_comment_chars` is
             * really 2000, 3000 or 5000 depending on where you are posting, so
             * validating against a constant would reject two thirds of the
             * site's legitimate posts or accept posts a third of it forbids.
             */
            /* Required only when nothing is attached. A reply that is just a
               picture is the most ordinary thing on an image board, and the
               composer lets one be sent -- a server that then rejected it
               would be a Post button that fails for a case the interface
               explicitly allows. */
            'body' => [
                'required_without:media',
                'nullable',
                'string',
                'max:'.$model->max_comment_chars,
            ],

            /** Post numbers this reply answers, rendered as `>>` references. */
            'quotes' => ['array'],
            'quotes.*' => ['integer'],

            /**
             * The one file Clover ever holds.
             *
             * Everything ingested points at 4chan's CDN and is never copied.
             * This is the other direction: an image an anon attached here,
             * which 4chan has never seen and has no id for. It is kept as a row
             * in `attachments` (see `readImage`).
             *
             * `mimes` is the rule doing the work, and it does more than its
             * name suggests: it guesses the type from the file's *contents*,
             * so a zip called `.png` is rejected on what it is rather than on
             * what it claims. Verified by deleting `image` and watching that
             * test stay green.
             *
             * `image` is kept as a guard on the list rather than on the file:
             * it is redundant against these five extensions and stops being
             * redundant the moment somebody widens them.
             *
             * The last rule is the space check, against the total and against
             * this account's share (`quotaError`). `bail` so it only costs a
             * query for a file that has passed everything else. It is a
             * courtesy, to say no before the file is processed: the check that
             * holds is the one repeated under a lock when the image is stored.
             *
             * `prohibited` when attachments are switched off: a deployment
             * that does not want uploads must refuse them outright rather
             * than accept one and not show it, which is worse than a
             * validation error the composer already warns about.
             */
            'media' => config('clover.attachments.enabled')
                ? [
                    'bail',
                    'nullable',
                    'file',
                    'image',
                    'mimes:'.implode(',', (array) config('clover.attachments.mimes')),
                    'max:'.config('clover.attachments.max_kilobytes'),
                    function (string $attribute, mixed $value, Closure $fail) use ($request): void {
                        $error = $value instanceof UploadedFile
                            ? $this->quotaError($request->user(), (int) $value->getSize())
                            : null;

                        if ($error !== null) {
                            $fail($error);
                        }
                    },
                ]
                : ['prohibited'],
        ]);

        $user = $request->user();

        /**
         * Only numbers that exist on this thread survive. A quote pointing at
         * a post that is not here renders as a reference to nothing, and the
         * reply tree would try to nest under a parent it cannot find.
         */
        $quotes = array_values(array_intersect(
            array_map('intval', $validated['quotes'] ?? []),
            $target->posts()->pluck('no')->map('intval')->all(),
        ));

        $image = $this->readImage($request);

        DB::transaction(function () use ($target, $model, $user, $validated, $quotes, $image): void {
            /* Taken first and held to the end, so two uploads cannot both read
               the same total and both fit. Always before the board's lock
               (inside `LocalPostNumbers::next`), so the two never wait on each
               other in opposite orders. */
            if ($image !== null) {
                AdvisoryLock::take(AdvisoryLock::IMAGES);
            }

            $post = Post::query()->create([
                'thread_id' => $target->id,
                'user_id' => $user->id,
                'no' => LocalPostNumbers::next($model),
                'is_op' => false,
                'is_local' => true,

                /**
                 * `Anonymous`, like everything else on the board. The account
                 * wrote it and the account can find it again; the post carries
                 * no name, because that is the product's entire claim.
                 *
                 * The tripcode is the one exception, and only because an anon
                 * opted into it.
                 */
                'author' => 'Anonymous',
                'tripcode' => $user->tripcode,

                'capcode' => null,
                'body' => trim((string) ($validated['body'] ?? '')),
                'quotes' => $quotes,
                'posted_at' => Date::now(),
                ...($image['columns'] ?? []),
            ]);

            /* The image needs the post's id, so it cannot go in before it, and
               the board's lock (taken for the number above) is held through
               this insert. Only other replies on this board wait for it. */
            if ($image !== null) {
                $this->storeImage($post, $user, $image);
            }

            /**
             * A reply bumps its thread, which is the ordering the whole
             * product runs on. Without this a local reply is invisible to
             * every surface that sorts by bump time — which is all of them.
             *
             * The count is added to in the database, not written from the
             * model loaded above: an import that landed since would be
             * overwritten with a number that predates it. Imports are
             * absolute and already include local replies
             * (`Importer::localReplyCounts`), so the two meet at the same
             * total whichever runs last.
             */
            $target->increment('replies_count', 1, ['bumped_at' => $target->fromDateTime(Date::now())]);
        });

        return back();
    }

    /**
     * Why this image cannot be stored right now, or null when it fits.
     *
     * Two limits, both because the images live in the same Neon database as
     * the mirror, whose free tier is 0.5GB all told:
     *
     *   the total   `max_total_kilobytes` across every account, so the images
     *               can never crowd the mirror out of its own database; and
     *   the share   `max_account_kilobytes` for one account, so one account
     *               cannot use the whole total and leave everyone else with
     *               the "full" message.
     *
     * ponytail: sums over the table, checked under a lock before the insert.
     * That is exact but costs a sum per upload, which is nothing at this size.
     * The upgrade is a real bucket (S3, R2, Vercel Blob) behind
     * `attachments.show`, at which point the table and these limits go.
     */
    private function quotaError(User $user, int $incoming): ?string
    {
        $total = (int) config('clover.attachments.max_total_kilobytes') * 1024;
        $share = (int) config('clover.attachments.max_account_kilobytes') * 1024;

        if (Attachment::totalBytes() + $incoming > $total) {
            return 'Clover is not taking new images right now: the space set aside for them is full. Post the reply as text instead.';
        }

        if (Attachment::bytesOf($user) + $incoming > $share) {
            return sprintf(
                'You have used the %d MB of image space each account gets. Post the reply as text instead.',
                intdiv($share, 1024 * 1024),
            );
        }

        return null;
    }

    /**
     * Check an attached image, take the personal details out of it, and
     * describe it the way a post expects.
     *
     * Returns null when nothing was attached -- the common case, which is why
     * the result is spread into the create rather than threaded through as
     * nullable arguments.
     *
     * The type comes from the bytes. The client's header and the file's
     * extension are both things the sender chose, so neither decides what is
     * stored or what it is later served as. What is stored is what
     * `ImageScrubber` returns, with the size and dimensions measured on that,
     * not on the upload: EXIF (a phone's position and camera), text chunks,
     * comments and anything glued on after the image's end do not reach the
     * database. The upload is read where it was left; validation does not
     * consume the temp file, whatever this method's comment once said.
     *
     * The original filename is kept in `media_filename` because that is what
     * the interface shows and what a screen reader reads, and it is only ever
     * rendered as text. It addresses nothing: the image is found by a
     * generated uuid, which `media_path` holds.
     *
     * @return array{columns: array<string, mixed>, bytes: string, uuid: string, mime: string, size: int, width: int, height: int}|null
     */
    private function readImage(Request $request): ?array
    {
        $file = $request->file('media');

        if (! $file instanceof UploadedFile) {
            return null;
        }

        $path = (string) $file->getRealPath();
        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($path);
        $clean = is_string($mime) && in_array($mime, Attachment::allowedMimes(), true)
            ? ImageScrubber::clean((string) file_get_contents($path), $mime)
            : null;

        if ($mime === false || $clean === null) {
            throw ValidationException::withMessages(['media' => 'That file is not an image Clover accepts.']);
        }

        $uuid = (string) Str::uuid();
        $size = strlen($clean['bytes']);

        return [
            'columns' => [
                'media_path' => $uuid,
                'media_filename' => pathinfo((string) $file->getClientOriginalName(), PATHINFO_FILENAME),
                'media_extension' => '.'.$file->getClientOriginalExtension(),
                'media_width' => $clean['width'],
                'media_height' => $clean['height'],
                'media_size' => $size,
                'media_spoiler' => false,
            ],
            'bytes' => $clean['bytes'],
            'uuid' => $uuid,
            'mime' => $mime,
            'size' => $size,
            'width' => $clean['width'],
            'height' => $clean['height'],
        ];
    }

    /**
     * Write the image under its post, after checking once more that it fits.
     *
     * The check in validation ran before any lock, so another upload may have
     * landed since. This one runs with the images lock held, and the lock is
     * held to the end of the transaction, so what it reads stays true until
     * the row is in.
     *
     * Handed over as a stream, not a string: Postgres will not take arbitrary
     * bytes as text, and a stream is bound as a large object, which both
     * drivers accept.
     *
     * @param  array{bytes: string, uuid: string, mime: string, size: int, width: int, height: int}  $image
     */
    private function storeImage(Post $post, User $user, array $image): void
    {
        $error = $this->quotaError($user, $image['size']);

        if ($error !== null) {
            throw ValidationException::withMessages(['media' => $error]);
        }

        Attachment::query()->create([
            'uuid' => $image['uuid'],
            'post_id' => $post->id,
            'mime' => $image['mime'],
            'bytes' => Attachment::stream($image['bytes']),
            'size' => $image['size'],
            'width' => $image['width'],
            'height' => $image['height'],
        ]);
    }
}
