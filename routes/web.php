<?php

use App\Http\Controllers\BoardController;
use App\Http\Controllers\ThreadController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

/**
 * The feed, in three sorts. All three are public: reading needs no account,
 * which is the product's central claim and should not be contradicted by the
 * routing.
 */
Route::inertia('popular', 'feed', ['sort' => 'popular'])->name('popular');
Route::inertia('latest', 'feed', ['sort' => 'latest'])->name('latest');

/**
 * Destinations the Clover sidebar links to that have no screen yet. They
 * resolve to a shared placeholder rather than a 404 so the nav is honest
 * about being unfinished instead of looking broken. Each passes the key its
 * copy is written against; replacing one with a real screen is a matter of
 * pointing the route at a different component.
 */
Route::inertia('communities', 'placeholder', ['destination' => 'communities'])->name('communities');

Route::middleware('auth')->group(function () {
    Route::inertia('account', 'placeholder', ['destination' => 'account'])->name('account');
    Route::inertia('bookmarks', 'placeholder', ['destination' => 'bookmarks'])->name('bookmarks');
    Route::inertia('history', 'placeholder', ['destination' => 'history'])->name('history');
    Route::inertia('messages', 'placeholder', ['destination' => 'messages'])->name('messages');
    Route::inertia('notifications', 'placeholder', ['destination' => 'notifications'])->name('notifications');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'feed', ['sort' => 'bumped'])->name('dashboard');
});

/**
 * Utility pages linked from the sidebar footer and the homepage footer. None
 * are written yet, so each resolves to a plain "not written yet" screen.
 *
 * They exist because the alternative is worse. Task 4 linked four of these and
 * shipped four live 404s; disabling the links instead would hide them from
 * screen-reader navigation entirely and make the footer read as broken. An
 * honest placeholder is the only option that neither lies nor breaks.
 */
collect([
    'rules' => 'Rules',
    'faq' => 'FAQ',
    'status' => 'Status',
    'terms' => 'Terms',
    'privacy' => 'Privacy',
    'dmca' => 'DMCA',
    'contact' => 'Contact',
    'search' => 'Search',
    'janitors' => 'Janitor queue',
    'report' => 'Report a post',
    'contribute' => 'Contribute',
])->each(function (string $title, string $uri): void {
    Route::inertia($uri, 'information', ['title' => $title])->name($uri);
});

/**
 * Boards and threads, registered last and constrained to known slugs.
 *
 * `/{board}` has the same shape as every named page above it, so without the
 * constraint the router would resolve `/rules` as a board and shadow the real
 * page. Registering these last is belt and braces: the constraint is what
 * actually does the work, and `BoardRoutingTest` proves both halves.
 *
 * The slug list lives in `config/clover.php` and becomes a database lookup
 * once the backend lands.
 */
$boardPattern = implode('|', config('clover.boards'));

Route::get('{board}', BoardController::class)
    ->where('board', $boardPattern)
    ->name('board');

Route::get('{board}/{thread}', ThreadController::class)
    ->where(['board' => $boardPattern, 'thread' => '[0-9]+'])
    ->name('thread');

require __DIR__.'/settings.php';
