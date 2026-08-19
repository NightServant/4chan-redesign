<?php

declare(strict_types=1);

namespace App\Observers;

use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Storage;

/**
 * What an account takes with it when it goes.
 *
 * The privacy page promises that an image attached to a reply is deleted with
 * the account that posted it. Nothing enforced that. `posts.user_id` is
 * `nullOnDelete`, so a deleted account left its posts behind as anonymous rows
 * — which is deliberate, and stays — but the rows kept addressing files on the
 * `public` disk that no account could reach any more, and nothing ever removed
 * those files. The promise was copy, not behaviour.
 *
 * This runs on `deleting` rather than `deleted` because `user_id` is the only
 * thing that ties a file to an account, and the database has nulled it by the
 * time `deleted` fires.
 *
 * It is an observer rather than a step in `ProfileController::destroy` because
 * the controller is one of the ways an account can go. A console command, a
 * queued job or a future cascade would walk straight past a fix that lived in
 * an HTTP handler.
 */
class UserObserver
{
    /**
     * Every media column, so a cleared row describes no file at all rather
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
     * Delete the files this account uploaded, and stop its posts pointing at
     * them.
     *
     * Both halves matter. Deleting the file alone would leave a post rendering
     * a broken image; clearing the columns alone would leave the file on disk
     * forever with nothing left that could ever find it again.
     */
    public function deleting(User $user): void
    {
        $disk = Storage::disk(config('clover.attachments.disk'));

        $user->posts()
            ->whereNotNull('media_path')
            ->chunkById(100, function (Collection $posts) use ($disk): void {
                /** @var Post $post */
                foreach ($posts as $post) {
                    /* A file already gone is not a failure. Disks get pruned
                       and restored from backups that miss things, and an
                       account that cannot be deleted because one of its images
                       is missing is a worse outcome than the orphan was. */
                    $disk->delete((string) $post->media_path);

                    $post->forceFill(self::CLEARED_MEDIA)->save();
                }
            });
    }
}
