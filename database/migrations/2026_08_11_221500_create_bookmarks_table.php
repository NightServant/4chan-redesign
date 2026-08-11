<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Threads an anon saved, and the note they wrote on it.
 *
 * Private to the account and visible to nobody else, which is why it lives
 * here rather than on the thread: what an anon reads is not something the
 * board publishes.
 *
 * A saved thread can be pruned upstream while the bookmark survives, so the
 * foreign key cascades on delete. Losing the bookmark with the thread is
 * correct — a saved link to nothing is not worth keeping.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bookmarks', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('thread_id')->constrained()->cascadeOnDelete();

            /**
             * The anon's own note. Empty string rather than null when they
             * wrote none: the screen renders it either way, and two spellings
             * of "nothing" is one more than the interface can use.
             */
            $table->text('note')->default('');

            $table->timestamps();

            $table->unique(['user_id', 'thread_id']);

            /** The bookmarks screen lists newest first. */
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bookmarks');
    }
};
