<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Clover sync
|--------------------------------------------------------------------------
|
| Both entries are paced by the same limit: the client allows one request a
| second, and it measures the gap through the cache rather than per process,
| so these two overlapping does not double the rate — it interleaves them.
|
| The catalog pass is one request for `boards.json` plus one per board, so 77
| boards is about eighty seconds. Every fifteen minutes keeps the feed close to
| a live board without spending anything on a quiet one: each request carries
| `If-Modified-Since`, and a board nobody has posted on answers `304`.
|
| The posts pass is one request per thread, which is the expensive one — the
| full `threads_per_board` across every board would be over half an hour of
| requests. It runs hourly against the five most recently bumped threads a
| board has instead, roughly six minutes, which is the part of a board anyone
| actually opens.
|
| `withoutOverlapping` because a run that outlasts its interval should be left
| to finish rather than raced by a second copy.
|
*/

Schedule::command('clover:sync')
    ->everyFifteenMinutes()
    ->withoutOverlapping();

Schedule::command('clover:sync', ['--with-posts', '--post-limit=5'])
    ->hourly()
    ->withoutOverlapping();
