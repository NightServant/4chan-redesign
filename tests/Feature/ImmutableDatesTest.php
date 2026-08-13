<?php

declare(strict_types=1);

use App\Models\Board;
use App\Models\Bookmark;
use App\Models\Post;
use App\Models\Thread;
use App\Models\ThreadRead;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;

/**
 * Dates are immutable everywhere, and the code says so.
 *
 * `AppServiceProvider` sets `Date::use(CarbonImmutable::class)`, so every model
 * timestamp hydrates as `CarbonImmutable`. Twice in one session a method was
 * type-hinted `Illuminate\Support\Carbon` instead — which is a *sibling* of
 * `CarbonImmutable`, not a parent — and threw `TypeError` on real data.
 *
 * Static analysis confirmed both, because the models' `@property` blocks
 * claimed `Carbon` too. Two pieces of type information that agreed with each
 * other and were both wrong; PHPStan can only check declarations against
 * declarations, so it had nothing to catch.
 *
 * These tests check the runtime instead, which is the only place the truth
 * lives.
 */
it('resolves the date factory to the immutable implementation', function (): void {
    expect(Date::now())->toBeInstanceOf(CarbonImmutable::class);
    expect(now())->toBeInstanceOf(CarbonImmutable::class);
});

/**
 * The failure both bugs had in common: a value that is a `CarbonInterface` but
 * is *not* an `Illuminate\Support\Carbon`, meeting a parameter that demanded
 * one.
 */
it('hydrates every model timestamp as an immutable date', function (): void {
    $board = Board::factory()->create();
    $thread = Thread::factory()->for($board)->create();
    $post = Post::factory()->for($thread)->create();
    $user = User::factory()->create();

    $timestamps = [
        'board.synced_at' => $board->synced_at,
        'board.created_at' => $board->created_at,
        'thread.posted_at' => $thread->posted_at,
        'thread.bumped_at' => $thread->bumped_at,
        'thread.synced_at' => $thread->synced_at,
        'post.posted_at' => $post->posted_at,
        'post.created_at' => $post->created_at,
        'user.created_at' => $user->created_at,
        'bookmark.created_at' => Bookmark::factory()->create(['thread_id' => $thread->id])->created_at,
        'read.last_read_at' => ThreadRead::factory()->create(['thread_id' => $thread->id])->last_read_at,
    ];

    foreach ($timestamps as $name => $value) {
        expect($value)->toBeInstanceOf(
            CarbonImmutable::class,
            "{$name} is not immutable, so anything hinting a mutable Carbon will reject it",
        );
    }
});

/**
 * A round trip, because a value written by one of the write paths and read
 * back by a screen is where this actually bit.
 */
it('reads a written timestamp back as immutable', function (): void {
    $thread = Thread::factory()->for(Board::factory())->create();
    $user = User::factory()->create();

    ThreadRead::query()->create([
        'user_id' => $user->id,
        'thread_id' => $thread->id,
        'progress' => 10,
        'last_read_at' => Date::now(),
    ]);

    expect(ThreadRead::query()->first()->last_read_at)
        ->toBeInstanceOf(CarbonImmutable::class);
});

/**
 * No source file may hint the mutable class.
 *
 * A scanner rather than a type check, because the type checker is precisely
 * what missed this: it compared a wrong annotation against a wrong hint and
 * found them consistent. `CarbonInterface` is what a parameter should ask for,
 * since both implementations satisfy it.
 */
it('hints no mutable Carbon anywhere in the application', function (): void {
    $offenders = [];

    /** @var SplFileInfo $file */
    foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator(app_path())) as $file) {
        if ($file->getExtension() !== 'php') {
            continue;
        }

        $source = (string) file_get_contents($file->getPathname());

        /* Prose in a comment explaining the bug is not a usage of it. */
        $source = preg_replace('/^\s*\*.*$/m', '', $source) ?? $source;

        if (preg_match('/use Illuminate\\\\Support\\\\Carbon;|use Carbon\\\\Carbon;/', $source) === 1) {
            $offenders[] = str_replace(base_path().'/', '', $file->getPathname());
        }
    }

    expect($offenders)->toBe(
        [],
        'these import the mutable Carbon; use CarbonImmutable for properties and CarbonInterface for parameters',
    );
});
