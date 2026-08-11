<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * What an anon has read, and how far into it they got.
 *
 * One row per anon per thread, updated on each visit rather than appended to.
 * A history that recorded every visit would show the same thread six times in
 * an afternoon, which is a log rather than a history — the screen groups by
 * day and wants the last time you were there, not all of them.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('thread_reads', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('thread_id')->constrained()->cascadeOnDelete();

            /**
             * How far down the thread they were, 0-100.
             *
             * Reported by the client, so it is clamped on the way in. The
             * history screen groups by "least finished", and a progress value
             * of 400 would sort above everything real.
             */
            $table->unsignedTinyInteger('progress')->default(0);

            /** Drives both the grouping and the ordering on the screen. */
            $table->timestamp('last_read_at');

            $table->timestamps();

            $table->unique(['user_id', 'thread_id']);
            $table->index(['user_id', 'last_read_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('thread_reads');
    }
};
