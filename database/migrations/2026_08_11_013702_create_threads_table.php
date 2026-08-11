<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Threads, ingested from each board's `catalog.json`.
 *
 * `no` is unique per board rather than globally: 4chan's post numbers are a
 * per-board sequence, so `/g/109522303` and `/b/109522303` can both exist and
 * a global unique index would reject the second one at random.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('threads', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('board_id')->constrained()->cascadeOnDelete();

            /** The OP's post number, rendered as `>>109522303`. */
            $table->unsignedBigInteger('no');

            /**
             * 4chan's `sub`. Genuinely absent on most threads — only a few
             * boards require a subject — so the display title falls back to
             * the opening line of the OP rather than inventing one.
             */
            $table->string('subject')->nullable();

            $table->boolean('sticky')->default(false);
            $table->boolean('closed')->default(false);

            /**
             * Upstream's own counts, not a count of the `posts` rows. A
             * catalog entry reports the whole thread while only its last few
             * replies are included, so deriving these locally would under-report
             * every thread that has not had its full page fetched.
             */
            $table->unsignedInteger('replies_count')->default(0);
            $table->unsignedInteger('images_count')->default(0);

            $table->timestamp('posted_at');

            /** 4chan's `last_modified`. Bump order is the board's ordering. */
            $table->timestamp('bumped_at');

            /**
             * Whether the full thread page has been fetched, as opposed to
             * only the catalog stub. The thread page needs every reply; the
             * feed and board pages need none of them.
             */
            $table->timestamp('posts_synced_at')->nullable();

            $table->timestamp('synced_at')->nullable();
            $table->timestamps();

            $table->unique(['board_id', 'no']);
            $table->index(['board_id', 'bumped_at']);
            $table->index('bumped_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('threads');
    }
};
