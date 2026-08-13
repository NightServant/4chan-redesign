<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\BoardController;
use App\Http\Controllers\BoardSubscriptionController;
use App\Http\Controllers\BookmarkController;
use App\Http\Controllers\BookmarksController;
use App\Http\Controllers\CommunityController;
use App\Http\Controllers\FeedController;
use App\Http\Controllers\HistoryController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\ReplyController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\ThreadController;
use App\Http\Controllers\ThreadCreationController;
use App\Http\Controllers\ThreadReadController;
use App\Support\RoutableBoards;
use Illuminate\Support\Facades\Route;

Route::get('/', HomeController::class)->name('home');

/**
 * The feed, in three sorts. All three are public: reading needs no account,
 * which is the product's central claim and should not be contradicted by the
 * routing.
 *
 * The sort is a route default rather than a segment, so the controller is
 * handed it directly and the page never has to read it back out of the URL.
 */
Route::get('popular', FeedController::class)->defaults('sort', 'popular')->name('popular');
Route::get('latest', FeedController::class)->defaults('sort', 'latest')->name('latest');

/**
 * The board directory. Public, like the boards it lists: an anon deciding
 * whether the site is worth an account has to be able to see what is on it.
 */
Route::get('communities', CommunityController::class)->name('communities');

/**
 * Search, over this application's own database rather than 4chan: there is no
 * search endpoint upstream and a browser could not call one if there were.
 *
 * Public, like the boards it searches. `suggest` is registered first and more
 * specifically, so it is never swallowed by the page route.
 */
Route::get('search/suggest', [SearchController::class, 'suggest'])->name('search.suggest');
Route::get('search', SearchController::class)->name('search');

Route::middleware('auth')->group(function () {
    Route::get('account', AccountController::class)->name('account');
    Route::get('bookmarks', BookmarksController::class)->name('bookmarks');
    Route::get('history', HistoryController::class)->name('history');

    /**
     * The last destination still without a screen. It keeps the shared
     * placeholder rather than 404ing, so the nav stays honest about being
     * unfinished instead of looking broken.
     */
    Route::inertia('notifications', 'placeholder', ['destination' => 'notifications'])->name('notifications');

    /**
     * What an account can do, as opposed to read.
     *
     * All of it is private to the anon doing it — a saved thread, a followed
     * board and a read marker are none of them visible to anyone else. Each is
     * a toggle in the interface, so each is idempotent here: a double submit is
     * a double press, not an error.
     *
     * Sharing is not here because it needs no route. A share is a link to a
     * page that already exists, built in the browser from the thread's own URL;
     * nothing is recorded when one is sent.
     */
    Route::post('threads/{thread}/bookmark', [BookmarkController::class, 'store'])->name('threads.bookmark');
    Route::delete('threads/{thread}/bookmark', [BookmarkController::class, 'destroy'])->name('threads.bookmark.destroy');

    Route::post('threads/{thread}/read', [ThreadReadController::class, 'store'])->name('threads.read');
    Route::delete('threads/{thread}/read', [ThreadReadController::class, 'forget'])->name('threads.read.forget');
    Route::delete('history', [ThreadReadController::class, 'destroy'])->name('history.destroy');

    Route::post('boards/{board}/subscribe', [BoardSubscriptionController::class, 'store'])->name('boards.subscribe');
    Route::delete('boards/{board}/subscribe', [BoardSubscriptionController::class, 'destroy'])->name('boards.subscribe.destroy');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', FeedController::class)->defaults('sort', 'bumped')->name('dashboard');
});

/**
 * Clover's standing pages.
 *
 * There were twelve. Eleven resolved to a screen saying they had not been
 * written, which was honest and still wrong: the footer is a map of the
 * product, and it was advertising a janitor queue, a report flow, a
 * contribution guide, a status page, a DMCA process and a contact address for
 * a read-only mirror that has none of them. Those six were removed rather than
 * written, because being upfront that a page is empty does not help when the
 * page should not exist.
 *
 * The four that describe things Clover actually does now carry real copy.
 *
 * `search` used to keep a placeholder here. It has a real page now, above.
 */
collect([
    'rules' => 'Rules',
    'faq' => 'FAQ',
    'terms' => 'Terms',
    'privacy' => 'Privacy',
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
 * The slug list comes from the synced `boards` table, cached, falling back to
 * `config('clover.fallback_boards')` when the table cannot be read.
 */
$boardPattern = RoutableBoards::pattern();

Route::get('{board}', BoardController::class)
    ->where('board', $boardPattern)
    ->name('board');

Route::get('{board}/{thread}', ThreadController::class)
    ->where(['board' => $boardPattern, 'thread' => '[0-9]+'])
    ->name('thread');

/**
 * Replying, which needs an account and so cannot sit in the public group
 * above. Registered with the board-shaped routes rather than beside the other
 * account actions, because it takes the same two constrained segments and
 * splitting it from them is how the constraint gets forgotten.
 */
Route::post('{board}/threads', [ThreadCreationController::class, 'store'])
    ->middleware('auth')
    ->where('board', $boardPattern)
    ->name('threads.store');

Route::post('{board}/{thread}/replies', [ReplyController::class, 'store'])
    ->middleware('auth')
    ->where(['board' => $boardPattern, 'thread' => '[0-9]+'])
    ->name('replies.store');

require __DIR__.'/settings.php';
