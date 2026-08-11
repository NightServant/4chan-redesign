<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Posts: the OP and every reply on a thread.
 *
 * `body` holds plain text, not the HTML 4chan returns. The API's `com` field
 * is markup — `<br>`, `<wbr>`, `<span class="quote">`, `<a class="quotelink">`
 * and HTML entities — and storing it raw would mean either escaping it at
 * render time (showing anons the tags) or trusting it into
 * `dangerouslySetInnerHTML`. It is parsed once on the way in instead, so what
 * reaches React is text and a list of quoted post numbers.
 *
 * Media is metadata only. 4chan reports a real filename, extension, dimensions
 * and byte size, and those are what the placeholder renders; the image itself
 * is never fetched or hotlinked.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('posts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('thread_id')->constrained()->cascadeOnDelete();

            $table->unsignedBigInteger('no');
            $table->boolean('is_op')->default(false);

            $table->string('author')->default('Anonymous');

            /** The opt-in signature an anon may attach. Null for a plain post. */
            $table->string('tripcode')->nullable();

            /** `mod`, `admin`, `founder` and friends. Null for an ordinary anon. */
            $table->string('capcode')->nullable();

            $table->text('body');

            /**
             * Post numbers this post quotes, in the order they appear, as a
             * JSON array of integers.
             *
             * Cross-board quotes (`>>>/biz/`) are dropped on the way in: they
             * point at something this thread does not contain, and rendering
             * one as a same-thread reference would be a link to nowhere.
             */
            $table->json('quotes');

            $table->string('media_filename')->nullable();
            $table->string('media_extension')->nullable();
            $table->unsignedInteger('media_width')->nullable();
            $table->unsignedInteger('media_height')->nullable();
            $table->unsignedBigInteger('media_size')->nullable();

            $table->timestamp('posted_at');
            $table->timestamps();

            $table->unique(['thread_id', 'no']);
            $table->index(['thread_id', 'posted_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('posts');
    }
};
