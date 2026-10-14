<?php

declare(strict_types=1);

use App\Models\Attachment;
use App\Models\Board;
use App\Models\Post;
use App\Models\Thread;
use App\Models\User;
use App\Support\RoutableBoards;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Support\Facades\DB;

/**
 * Serving an image back out of the database.
 *
 * The bytes are a real PNG from the factory, so NULs and non-UTF-8 go through
 * the column on both drivers: on Postgres that is a `bytea` read as a stream,
 * on SQLite a string.
 */
beforeEach(function (): void {
    RoutableBoards::forget();
});

function storedAttachment(bool $worksafe = true): Attachment
{
    $board = Board::factory()->slug($worksafe ? 'g' : 'b')->state(['worksafe' => $worksafe])->create();
    $thread = Thread::factory()->for($board)->create();
    $post = Post::factory()->for($thread)->create(['media_filename' => 'x230', 'media_extension' => '.png']);

    $attachment = Attachment::factory()->for($post)->create();
    $post->forceFill(['media_path' => $attachment->uuid])->save();

    return $attachment;
}

it('serves the stored bytes with the stored mime and nothing sniffable', function (): void {
    $attachment = storedAttachment();
    $expected = Attachment::query()->findOrFail($attachment->id)->contents();

    $response = $this->get("/attachments/{$attachment->uuid}")->assertOk();

    expect($response->getContent())->toBe($expected)
        ->and(strlen($expected))->toBe($attachment->size)
        ->and($response->headers->get('Content-Type'))->toBe('image/png')
        ->and($response->headers->get('X-Content-Type-Options'))->toBe('nosniff')
        ->and($response->headers->get('Content-Disposition'))->toBe('inline');
});

/**
 * An image on a safe board is the same for everyone, so the CDN may keep it.
 * For a day and not for good: a deleted account's image can outlive its row in
 * a cache, and the privacy page says how long (`information.test.ts`).
 */
it('lets a CDN keep an image from a worksafe board for a day, and no longer', function (): void {
    $cache = $this->get('/attachments/'.storedAttachment()->uuid)->headers->get('Cache-Control');

    expect($cache)->toContain('public')
        ->and($cache)->toContain('max-age=86400')
        ->and($cache)->toContain('s-maxage=86400')
        ->and($cache)->not->toContain('immutable');
});

/**
 * A response with a cookie is not one a shared cache will keep, and a session
 * write per image would race the page's own. The public route runs without
 * either.
 */
it('sets no cookie and starts no session', function (): void {
    $response = $this->get('/attachments/'.storedAttachment()->uuid)->assertOk();

    expect($response->headers->getCookies())->toBe([])
        ->and($response->headers->has('Set-Cookie'))->toBeFalse();
});

it('answers 404 for a uuid it does not hold, or one that is not a uuid', function (): void {
    $this->get('/attachments/'.fake()->uuid())->assertNotFound();
    $this->get('/attachments/not-a-uuid')->assertNotFound();
});

/**
 * The type is checked again on the way out, so a row that ever held something
 * else is not served under a name a browser would run.
 */
it('refuses to serve a stored type that is not a configured image', function (string $mime): void {
    $attachment = storedAttachment();
    $attachment->forceFill(['mime' => $mime])->save();

    $this->get("/attachments/{$attachment->uuid}")->assertNotFound();
})->with(['image/svg+xml', 'text/html', 'application/zip']);

/**
 * Hidden boards stay hidden. A shared cache cannot know who is asking, so an
 * image from a board the viewer cannot see is not served from the public route
 * at all: a cached copy would answer an anon who never opted in.
 */
it('answers 404 on the public route for an image from a mature board', function (): void {
    $attachment = storedAttachment(worksafe: false);

    $this->get("/attachments/{$attachment->uuid}")->assertNotFound();
    $this->actingAs(User::factory()->create(['shows_mature_boards' => true]))
        ->get("/attachments/{$attachment->uuid}")->assertNotFound();
});

it('answers 404 on the mature route for a viewer who has not opted in', function (): void {
    $attachment = storedAttachment(worksafe: false);

    $this->get("/attachments/{$attachment->uuid}/mature")->assertNotFound();
    $this->actingAs(User::factory()->create(['shows_mature_boards' => false]))
        ->get("/attachments/{$attachment->uuid}/mature")->assertNotFound();
});

it('serves a mature board image to an opted-in viewer, for that browser only', function (): void {
    $attachment = storedAttachment(worksafe: false);

    $response = $this->actingAs(User::factory()->create(['shows_mature_boards' => true]))
        ->get("/attachments/{$attachment->uuid}/mature")
        ->assertOk();

    $cache = $response->headers->get('Cache-Control');

    expect($response->headers->get('Content-Type'))->toBe('image/png')
        ->and($response->headers->get('X-Content-Type-Options'))->toBe('nosniff')
        ->and($response->headers->get('Content-Disposition'))->toBe('inline')
        ->and($cache)->toContain('private')
        ->and($cache)->toContain('max-age=86400')
        ->and($cache)->not->toContain('public')
        ->and($cache)->not->toContain('s-maxage')
        ->and($cache)->not->toContain('immutable');
});

/** The bytes are up to 4MB; nothing that is about to be refused should read them. */
it('reads the bytes only for a request it is going to answer', function (): void {
    $mature = storedAttachment(worksafe: false);
    $queries = [];
    DB::listen(function (QueryExecuted $query) use (&$queries): void {
        $queries[] = $query->sql;
    });
    $readsBytes = function () use (&$queries): int {
        return count(array_filter($queries, fn (string $sql): bool => str_contains($sql, '"bytes"')));
    };

    $this->get("/attachments/{$mature->uuid}")->assertNotFound();
    $this->get("/attachments/{$mature->uuid}/mature")->assertNotFound();
    expect($readsBytes())->toBe(0);

    $this->actingAs(User::factory()->create(['shows_mature_boards' => true]))
        ->get("/attachments/{$mature->uuid}/mature")->assertOk();
    expect($readsBytes())->toBe(1);
});

it('answers a revalidation with 304 and without reading the bytes', function (): void {
    $attachment = storedAttachment();
    $etag = $this->get("/attachments/{$attachment->uuid}")->assertOk()->headers->get('ETag');

    expect($etag)->toBe('"'.$attachment->uuid.'"');

    $queries = [];
    DB::listen(function (QueryExecuted $query) use (&$queries): void {
        $queries[] = $query->sql;
    });

    $response = $this->get("/attachments/{$attachment->uuid}", ['If-None-Match' => $etag])
        ->assertStatus(304);

    expect($response->getContent())->toBe('')
        ->and($response->headers->get('ETag'))->toBe($etag)
        ->and($response->headers->get('Cache-Control'))->toContain('max-age=86400')
        ->and(array_filter($queries, fn (string $sql): bool => str_contains($sql, '"bytes"')))->toBe([]);

    $this->get("/attachments/{$attachment->uuid}", ['If-None-Match' => '"something-else"'])
        ->assertOk();
});

it('does not let a stranger revalidate their way past the board check', function (): void {
    $mature = storedAttachment(worksafe: false);

    $this->get("/attachments/{$mature->uuid}/mature", ['If-None-Match' => '"'.$mature->uuid.'"'])
        ->assertNotFound();
});

/**
 * Cache hits never reach the application, so this only bounds what a caller
 * can force past the cache, such as a new query string on every request.
 */
it('limits how often one address can ask for an image', function (string $path): void {
    $uuid = fake()->uuid();

    for ($i = 0; $i < 120; $i++) {
        $this->get(str_replace('{uuid}', $uuid, $path))->assertNotFound();
    }

    $this->get(str_replace('{uuid}', $uuid, $path))->assertStatus(429);
})->with(['/attachments/{uuid}', '/attachments/{uuid}/mature']);
