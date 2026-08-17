<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Board;
use App\Models\Post;
use App\Models\Thread;
use App\Services\LocalPostNumbers;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
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
                /* Whatever the thread is actually called. A thread with no
                   subject is ordinary on an imageboard, and the OP's opening
                   line is what a reader recognises it by in that case -- the
                   same fallback the thread page's own heading uses. */
                'title' => $target->subject ?: $target->originalPost?->excerpt() ?? '',
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
             * which 4chan has never seen and has no id for.
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
             */
            'media' => [
                'nullable',
                'file',
                'image',
                'mimes:'.implode(',', (array) config('clover.attachments.mimes')),
                'max:'.config('clover.attachments.max_kilobytes'),
            ],
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

        $media = $this->storeAttachment($request, $model);

        DB::transaction(function () use ($target, $model, $user, $validated, $quotes, $media): void {
            Post::query()->create([
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
                ...$media,
            ]);

            /**
             * A reply bumps its thread, which is the ordering the whole
             * product runs on. Without this a local reply is invisible to
             * every surface that sorts by bump time — which is all of them.
             */
            $target->forceFill([
                'bumped_at' => Date::now(),
                'replies_count' => $target->replies_count + 1,
            ])->save();
        });

        return back();
    }

    /**
     * Put an attached image on disk and describe it the way a post expects.
     *
     * Returns the media columns, or an empty array when nothing was attached —
     * which is the common case, and the reason this spreads into the create
     * rather than being threaded through as nullable arguments.
     *
     * The stored name is generated, never the one the browser sent. An
     * uploaded filename is attacker-controlled text that would otherwise end
     * up as a path; the original is kept in `media_filename` because that is
     * what the interface shows and what a screen reader reads, and it is only
     * ever rendered as text.
     *
     * @return array<string, mixed>
     */
    private function storeAttachment(Request $request, Board $board): array
    {
        $file = $request->file('media');

        if (! $file instanceof UploadedFile) {
            return [];
        }

        $path = $file->store(
            config('clover.attachments.directory').'/'.$board->slug,
            config('clover.attachments.disk'),
        );

        if ($path === false) {
            return [];
        }

        /* Read from the stored file rather than from the upload: by this point
           it is what will actually be served, and `getimagesize` on the temp
           file has already been consumed by the `image` rule. */
        $dimensions = @getimagesize(
            Storage::disk(config('clover.attachments.disk'))->path($path)
        );

        return [
            'media_path' => $path,
            'media_filename' => pathinfo(
                (string) $file->getClientOriginalName(),
                PATHINFO_FILENAME
            ),
            'media_extension' => '.'.$file->getClientOriginalExtension(),
            'media_width' => $dimensions[0] ?? null,
            'media_height' => $dimensions[1] ?? null,
            'media_size' => $file->getSize(),
            'media_spoiler' => false,
        ];
    }
}
