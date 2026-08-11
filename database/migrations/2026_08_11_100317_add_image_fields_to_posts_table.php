<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * What is needed to actually show an attachment rather than describe one.
 *
 * The posts table already carried a filename, dimensions and a byte size,
 * because media was metadata only and never rendered. None of that can build a
 * URL: 4chan's CDN is keyed on `tim`, its own image id, and the original
 * filename an anon uploaded plays no part in the path.
 *
 *   https://i.4cdn.org/{board}/{tim}{ext}     the full image
 *   https://i.4cdn.org/{board}/{tim}s.jpg     the thumbnail, always JPEG
 *
 * `tn_w` and `tn_h` come with it so a thumbnail can reserve its own space
 * before it loads. Without them every image in a feed shifts the page as it
 * arrives, which is the layout-shift version of the same problem.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('posts', function (Blueprint $table): void {
            /**
             * 4chan's image id: a unix timestamp in microseconds, which is
             * why it needs the full 64 bits rather than an integer.
             */
            $table->unsignedBigInteger('media_tim')->nullable()->after('media_extension');

            $table->unsignedInteger('media_thumb_width')->nullable()->after('media_height');
            $table->unsignedInteger('media_thumb_height')->nullable()->after('media_thumb_width');

            /**
             * 4chan's own `spoiler`. The board hides these behind a click and
             * so does Clover — it is a signal the source publishes, and
             * discarding it would show an anon something the person who
             * posted it deliberately covered up.
             */
            $table->boolean('media_spoiler')->default(false)->after('media_size');
        });
    }

    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table): void {
            $table->dropColumn([
                'media_tim',
                'media_thumb_width',
                'media_thumb_height',
                'media_spoiler',
            ]);
        });
    }
};
