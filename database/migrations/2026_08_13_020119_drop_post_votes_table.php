<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Blessings and curses are withdrawn.
 *
 * The feature was Clover's own invention rather than anything upstream: 4chan
 * has no votes to import, so every row here was cast on this site. In practice
 * that meant a ranking control sitting on eleven thousand ingested threads that
 * had, between them, almost no votes at all — a score of zero on every card,
 * and a sort option that ordered ties.
 *
 * The creating migration is left in place rather than edited away. It already
 * ran everywhere this application is deployed, and rewriting history would let
 * a fresh clone and an existing database disagree about what has happened.
 * Replaying both leaves no table, which is the intended end state.
 *
 * `down()` restores the table but not the rows. The data is not recoverable
 * from here, and pretending otherwise by leaving a comment about backfilling
 * would be worse than saying so.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('post_votes');
    }

    public function down(): void
    {
        Schema::create('post_votes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('post_id')->constrained()->cascadeOnDelete();
            $table->tinyInteger('value');
            $table->timestamps();
            $table->unique(['user_id', 'post_id']);
            $table->index(['post_id', 'value']);
        });
    }
};
