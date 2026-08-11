<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Boards an anon follows.
 *
 * `BoardDirectoryEntry.subscribed` has been a hardcoded false since the
 * directory landed, and the Join buttons on the rail and the directory have
 * been local component state that forgets itself on reload. This is what they
 * write to.
 *
 * A plain pivot: nothing about a subscription needs recording beyond who and
 * which, and when they did it.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('board_subscriptions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('board_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'board_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('board_subscriptions');
    }
};
