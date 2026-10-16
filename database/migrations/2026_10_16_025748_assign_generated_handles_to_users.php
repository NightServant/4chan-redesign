<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Every account gets a generated handle, replacing any it chose, and the
 * column stops accepting null.
 *
 * A chosen handle was the one thing on an account that could name the anon
 * behind it, so chosen ones are overwritten rather than kept. That part does
 * not reverse: `down` only lets the column be null again.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')->select('id')->eachById(function (object $user): void {
            DB::table('users')->where('id', $user->id)->update(['handle' => User::generateHandle()]);
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->string('handle')->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('handle')->nullable()->change();
        });
    }
};
