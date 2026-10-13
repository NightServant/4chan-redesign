<?php

declare(strict_types=1);

namespace App\Observers;

use App\Models\Attachment;
use App\Models\User;

/**
 * What an account takes with it when it goes.
 *
 * The privacy page promises an image attached to a reply is deleted with the
 * account that posted it. `posts.user_id` is `nullOnDelete`, so a deleted
 * account leaves its posts behind as anonymous rows -- which is deliberate,
 * and stays -- and the database therefore cannot cascade from the account to
 * the image: the post it hangs from is not going anywhere. (Deleting a *post*
 * does cascade, through `attachments.post_id`.)
 *
 * This runs on `deleting` rather than `deleted` because `user_id` is the only
 * thing that ties an image to an account, and the database has nulled it by
 * the time `deleted` fires.
 *
 * It is an observer rather than a step in `ProfileController::destroy` because
 * the controller is one of the ways an account can go. A console command, a
 * queued job or a future cascade would walk straight past a fix that lived in
 * an HTTP handler.
 */
class UserObserver
{
    /**
     * Every media column, so a cleared row describes no image at all rather
     * than a half of one. The upstream columns are here for completeness: a
     * local upload never has a `tim`, and clearing null is free.
     *
     * @var array<string, mixed>
     */
    private const CLEARED_MEDIA = [
        'media_path' => null,
        'media_filename' => null,
        'media_extension' => null,
        'media_tim' => null,
        'media_width' => null,
        'media_height' => null,
        'media_thumb_width' => null,
        'media_thumb_height' => null,
        'media_size' => null,
        'media_spoiler' => false,
    ];

    /**
     * Delete the images this account uploaded, and stop its posts pointing at
     * them.
     *
     * Both halves matter. Deleting the image alone would leave a post
     * rendering a broken one; clearing the columns alone would leave the bytes
     * in the database forever with nothing left that could ever find them
     * again.
     */
    public function deleting(User $user): void
    {
        Attachment::query()->whereIn('post_id', $user->posts()->select('id'))->delete();

        $user->posts()->whereNotNull('media_path')->update(self::CLEARED_MEDIA);
    }
}
