<?php

use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

/**
 * Destinations the Clover sidebar links to that have no screen yet. They
 * resolve to a shared placeholder rather than a 404 so the nav is honest
 * about being unfinished instead of looking broken. Each passes the key its
 * copy is written against; replacing one with a real screen is a matter of
 * pointing the route at a different component.
 */
Route::inertia('popular', 'placeholder', ['destination' => 'popular'])->name('popular');
Route::inertia('latest', 'placeholder', ['destination' => 'latest'])->name('latest');
Route::inertia('communities', 'placeholder', ['destination' => 'communities'])->name('communities');

Route::middleware('auth')->group(function () {
    Route::inertia('account', 'placeholder', ['destination' => 'account'])->name('account');
    Route::inertia('bookmarks', 'placeholder', ['destination' => 'bookmarks'])->name('bookmarks');
    Route::inertia('history', 'placeholder', ['destination' => 'history'])->name('history');
    Route::inertia('messages', 'placeholder', ['destination' => 'messages'])->name('messages');
    Route::inertia('notifications', 'placeholder', ['destination' => 'notifications'])->name('notifications');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
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

require __DIR__.'/settings.php';
