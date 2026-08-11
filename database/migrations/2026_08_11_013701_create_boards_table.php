<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Boards, ingested from 4chan's `boards.json`.
 *
 * Every column here except `category` comes straight off the API response, so
 * the per-board limits the composers enforce are the board's real ones rather
 * than one global constant guessed at in the frontend.
 *
 * `category` is the exception and is ours. 4chan groups boards on its own
 * index page but does not expose that grouping in the JSON, so the mapping
 * lives in `config/clover.php` and anything unmapped falls to "Other". It is
 * labelled as a local classification rather than passed off as upstream data.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('boards', function (Blueprint $table): void {
            $table->id();

            /**
             * The bare slug, e.g. `g`. Delimiters are a display concern and
             * are added when the row is shaped for the client, because three
             * of 4chan's slugs are numeric (`3`, `r9k`, `s4s`) and storing
             * `/3/` would invite parsing it back out again.
             */
            $table->string('slug')->unique();
            $table->string('title');
            $table->text('description');
            $table->string('category');

            /** 4chan's own `ws_board`. Drives whether an anon sees the board. */
            $table->boolean('worksafe');

            $table->unsignedInteger('max_comment_chars');
            $table->unsignedInteger('bump_limit');
            $table->unsignedInteger('image_limit');
            $table->unsignedInteger('per_page');
            $table->unsignedInteger('pages');
            $table->boolean('is_archived')->default(false);

            /** When the sync last saw this board in the upstream response. */
            $table->timestamp('synced_at')->nullable();

            $table->timestamps();

            $table->index('worksafe');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('boards');
    }
};
