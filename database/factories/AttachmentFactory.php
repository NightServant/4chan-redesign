<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Attachment;
use App\Models\Post;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Attachment>
 */
class AttachmentFactory extends Factory
{
    protected $model = Attachment::class;

    /**
     * A real 1x1 PNG, so the bytes carry the NULs and non-UTF-8 that a
     * database column would choke on if it were treated as text. They go in
     * as a stream, the way `ReplyController` writes them: Postgres rejects a
     * PHP string that is not valid UTF-8, and a stream is bound as a large
     * object instead.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $image = imagecreatetruecolor(1, 1);

        ob_start();
        imagepng($image);
        $png = (string) ob_get_clean();

        return [
            'uuid' => (string) Str::uuid(),
            'post_id' => Post::factory(),
            'mime' => 'image/png',
            'bytes' => fn () => Attachment::stream($png),
            'size' => strlen($png),
            'width' => 1,
            'height' => 1,
        ];
    }
}
