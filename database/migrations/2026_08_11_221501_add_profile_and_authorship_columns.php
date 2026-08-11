<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Who an anon is to the site, and who wrote a post.
 *
 * These are the two halves of the product's central claim and they are kept
 * apart deliberately. An account has a handle, a bio and a join date; a post
 * carries none of them. `posts.user_id` exists so an anon can find their own
 * writing again, not so anyone else can attribute it — nothing renders it, and
 * the only identity that ever appears beside a post is the tripcode an anon
 * opts into attaching.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            /**
             * The account's name on the site, distinct from `name`, which
             * Fortify owns and treats as a display name. Nullable because
             * every account that already exists predates this column; the
             * profile falls back until one is chosen.
             */
            $table->string('handle')->nullable()->unique()->after('name');

            /**
             * The opt-in signature an anon may attach to a post — the one
             * thing on an account that can appear beside something they wrote.
             */
            $table->string('tripcode')->nullable()->after('handle');

            $table->text('bio')->default('')->after('tripcode');
        });

        Schema::table('posts', function (Blueprint $table): void {
            /**
             * Null for everything ingested from 4chan, which is almost
             * everything. Set only on posts written here.
             */
            $table->foreignId('user_id')->nullable()->after('thread_id')
                ->constrained()->nullOnDelete();

            /**
             * Whether this post was written on Clover rather than ingested.
             *
             * Derivable from `user_id` today and stored anyway, because the
             * two answer different questions: `user_id` is who wrote it, and
             * this is where it came from. An account deleted later nulls the
             * first without making the post upstream's.
             */
            $table->boolean('is_local')->default(false)->after('is_op');

            $table->index(['user_id', 'posted_at']);
        });
    }

    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table): void {
            $table->dropIndex(['user_id', 'posted_at']);
            $table->dropConstrainedForeignId('user_id');
            $table->dropColumn('is_local');
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['handle', 'tripcode', 'bio']);
        });
    }
};
