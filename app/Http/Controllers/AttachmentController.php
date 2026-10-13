<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Attachment;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * An image attached to a reply written here, served out of the database.
 *
 * There are two routes, and the split is the point. A shared cache (Vercel's
 * CDN) is what keeps repeat views off the database, and it may only keep a
 * response that is the same for everyone and carries no cookie:
 *
 *   `show`    images from worksafe boards. Runs without a session, so no
 *             cookie and no session write per image, and is cached by the CDN.
 *   `mature`  images from boards 4chan marks not worksafe. Whether a viewer
 *             may see one depends on their account, so it needs the session
 *             and is cached by that viewer's browser only (`private`).
 *
 * `Post::mediaUrl()` picks the route from the board, so a page never asks the
 * shared route for something it must not hold. If it is asked anyway, it
 * answers 404.
 *
 * A 404 and never a 403, for the reason `Controller::visibleBoard` gives: a
 * hidden board is simply not there as far as the viewer is concerned.
 *
 * Both are cached for a day, not for good. Removing an account removes its
 * rows at once, but a copy already in the CDN or a browser outlives that, and
 * a day is how long the privacy page admits to. The ETag lets a browser
 * revalidate for the price of a 304 once the day is up, and the bytes are
 * only read from the database after the request is known to be allowed and
 * not already satisfied.
 */
class AttachmentController extends Controller
{
    private const DAY = 86400;

    public function show(Request $request, string $uuid): Response
    {
        $attachment = $this->find($uuid);

        abort_unless($attachment->post->thread->board->worksafe, 404);

        return $this->image($request, $attachment, 'public, max-age='.self::DAY.', s-maxage='.self::DAY);
    }

    public function mature(Request $request, string $uuid): Response
    {
        $attachment = $this->find($uuid);

        abort_unless(
            $attachment->post->thread->board->worksafe || $this->showsMatureBoards($request),
            404,
        );

        return $this->image($request, $attachment, 'private, max-age='.self::DAY);
    }

    /**
     * The row without its bytes, or a 404 for a uuid that is not here or
     * holds a type that is not a configured image.
     *
     * The type is checked on the way out as well as on the way in, so a row
     * that ever held something else is not served under a name a browser would
     * run.
     */
    private function find(string $uuid): Attachment
    {
        $attachment = Attachment::query()
            ->select(['id', 'uuid', 'post_id', 'mime', 'size'])
            ->with('post.thread.board')
            ->where('uuid', $uuid)
            ->firstOrFail();

        abort_unless(in_array($attachment->mime, Attachment::allowedMimes(), true), 404);

        return $attachment;
    }

    /**
     * Only the stored type, never one the client sent, and never sniffed.
     * `inline` because it is shown in the page; the original filename is not
     * offered, because it is attacker-supplied text. The uuid is the ETag: the
     * bytes behind a uuid never change.
     */
    private function image(Request $request, Attachment $attachment, string $cacheControl): Response
    {
        $etag = '"'.$attachment->uuid.'"';
        $headers = [
            'Cache-Control' => $cacheControl,
            'ETag' => $etag,
            'X-Content-Type-Options' => 'nosniff',
        ];

        if (array_intersect([$etag, 'W/'.$etag, '*'], $request->getETags()) !== []) {
            return response('', 304, $headers);
        }

        return response($attachment->contents(), 200, $headers + [
            'Content-Type' => $attachment->mime,
            'Content-Disposition' => 'inline',
        ]);
    }
}
