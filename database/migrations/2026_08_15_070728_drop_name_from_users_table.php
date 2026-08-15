<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Accounts stop holding a name.
 *
 * Registration asked for a full name on a site whose entire premise is that it
 * does not know who you are, and people answered it honestly: the column held
 * real legal names. It was then printed in the chrome of every screen, and
 * until task 17c it was the fallback heading on a public profile.
 *
 * Nothing reads it now. An account is identified by the address it signs in
 * with; an anon is identified by the handle they choose, which is theirs to
 * set and theirs to leave blank.
 *
 * This drops data and cannot restore it. The `down` recreates the column
 * because a migration should be reversible in shape, but every value in it is
 * gone — which is the point of running this.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('name');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            /* Nullable on the way back, because the values are gone and a
               `NOT NULL` column with no default cannot be added to a table
               that already has rows. */
            $table->string('name')->nullable()->after('id');
        });
    }
};
