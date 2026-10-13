<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The image a reply written here carries, kept as a row.
 *
 * Vercel's disk is one instance's scratch space, so a file written there is
 * gone when another instance serves the thread. The database is the only
 * durable thing the deployment has, so the bytes live in it: `bytes` is
 * `bytea` on Postgres and a blob on SQLite.
 *
 * `post_id` is what ties it to the post: deleting the post deletes the row.
 * `posts.media_path` holds the `uuid`, so a post can build its image URL
 * without a join. One image per reply, hence the unique key.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attachments', function (Blueprint $table): void {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('post_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('mime', 64);
            $table->binary('bytes');
            $table->unsignedInteger('size');
            $table->unsignedInteger('width')->nullable();
            $table->unsignedInteger('height')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attachments');
    }
};
