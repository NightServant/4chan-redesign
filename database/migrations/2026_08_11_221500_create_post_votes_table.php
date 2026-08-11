<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Blessings and curses.
 *
 * Clover's own, and the reason `Thread.blessings` has been a hardcoded zero
 * since the ingest landed: 4chan has no votes to import, so every one of these
 * is cast here.
 *
 * On posts rather than on threads, with no polymorphism. A thread's opening
 * post is a post, so blessing a thread card is blessing its OP — the same act
 * the thread page offers, recorded once. Two vote tables, or one polymorphic
 * table over threads and posts, would let a thread's own count and its OP's
 * count disagree about the same button.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('post_votes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('post_id')->constrained()->cascadeOnDelete();

            /**
             * `1` blesses, `-1` curses. An anon who withdraws a vote deletes
             * the row rather than storing a zero, so "has not voted" has one
             * representation instead of two that behave the same.
             */
            $table->tinyInteger('value');

            $table->timestamps();

            /** One vote per anon per post. The ballot box, enforced. */
            $table->unique(['user_id', 'post_id']);

            /** Counting a post's score reads this, on every card in a feed. */
            $table->index(['post_id', 'value']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('post_votes');
    }
};
