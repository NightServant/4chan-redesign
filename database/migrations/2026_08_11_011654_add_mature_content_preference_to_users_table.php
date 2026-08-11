<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Whether this anon has asked to see boards 4chan marks as not worksafe.
 *
 * Defaults to false, and the column is not nullable: "has not decided" and
 * "has decided no" must behave identically here, and a nullable flag invites
 * a `null` that reads as neither. Showing adult boards is something an anon
 * opts into, so the absence of a choice is the safe one.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->boolean('shows_mature_boards')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('shows_mature_boards');
        });
    }
};
