<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Where a locally uploaded attachment lives.
 *
 * Every media column on `posts` until now described a file on 4chan's CDN,
 * addressed by `media_tim` — 4chan's own id for it. That works because nothing
 * was ever uploaded here: the browser fetched the image from 4chan and Clover
 * held the identifier, not the file.
 *
 * A reply written on Clover can carry an image now, and that image has no
 * `tim` because 4chan has never seen it. `media_path` is what addresses it: a
 * path on the `public` disk, set for local uploads and null for everything
 * ingested. The two are mutually exclusive by construction, and `hasMedia()`
 * accepts either.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('posts', function (Blueprint $table): void {
            $table->string('media_path')->nullable()->after('media_tim');
        });
    }

    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table): void {
            $table->dropColumn('media_path');
        });
    }
};
