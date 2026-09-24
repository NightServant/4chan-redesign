<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Indexes for the feed's two sorts that aren't Home's bump order.
 *
 * `bumped_at` already has one, so Home is fine. Popular and Latest order by
 * `replies_count` and `posted_at` instead, and neither column was indexed, so
 * every request sorted the board's entire visible slice from scratch.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('threads', function (Blueprint $table): void {
            $table->index('replies_count');
            $table->index('posted_at');
        });
    }

    public function down(): void
    {
        Schema::table('threads', function (Blueprint $table): void {
            $table->dropIndex(['replies_count']);
            $table->dropIndex(['posted_at']);
        });
    }
};
