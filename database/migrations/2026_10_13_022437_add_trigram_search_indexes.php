<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * A trigram index for search over post bodies.
 *
 * `SearchController` matches with `ILIKE '%term%'`. A leading wildcard rules
 * out a b-tree, so every search read every post. A GIN index over trigrams
 * serves `ILIKE` directly, which leaves the query and what it matches exactly
 * as they were; full-text search would turn substring matching into word
 * matching, and "lin" would stop finding "linux".
 *
 * Only `posts.body` is indexed. It is the one column large enough to matter,
 * and the one the planner can use: the Comments tab filters it directly, and
 * the threads query reaches it through a hashed subquery. Thread subjects and
 * board text are also searched with `ILIKE` and are deliberately not indexed.
 * The subject match is OR-ed with that subquery, and Postgres cannot answer an
 * OR against a subquery from an index (checked with sequential and plain
 * index scans switched off: the index stays unused). Boards are about
 * seventy-seven rows, which it will always just read. An index on either would
 * be written to on every sync and never read.
 *
 * Postgres only. SQLite has no `pg_trgm`, and its `LIKE` is already
 * case-insensitive over data small enough that scanning it is not a problem.
 *
 * `create extension` is left to fail: a role that cannot create it should
 * stop the migration, not leave search silently unindexed.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('create extension if not exists pg_trgm');
        DB::statement('create index if not exists posts_body_trgm on posts using gin (body gin_trgm_ops)');
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('drop index if exists posts_body_trgm');
    }
};
