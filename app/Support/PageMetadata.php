<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Support\Arr;

/**
 * The title and description a crawler sees, resolved on the server.
 *
 * ## Why this exists
 *
 * Every page component already sets both through `PageMeta`, and every one of
 * them was correct. None of them reached a crawler. Inertia's `<Head>` writes
 * into the document once JavaScript has run, and no search engine, no Slack
 * unfurl and no `curl` runs any. SSR would have covered it, and `config/inertia.php`
 * even has it enabled — but there is no SSR entry point, no built bundle and no
 * Node process, so `inertia:check-ssr` reports the server is not running.
 *
 * The effect was that `/`, `/faq`, `/communities`, `/g/`, every thread and
 * every error page all served the identical `<title>Clover</title>` and the
 * identical generic description. Twenty-six distinct titles existed in the
 * source and none of them were on the wire.
 *
 * The Blade shell has emitted a static floor of social tags since the social
 * card landed, each carrying a `head-key` matching the one `PageMeta` uses, so
 * Inertia replaces rather than duplicates them in the browser. This makes that
 * floor per-page rather than one string for the whole site. It needs no second
 * process and it cannot drift out of sync with a deployment, because it is
 * computed from the same props the component renders.
 *
 * ## What it does not cover, deliberately
 *
 * Pages behind `auth` — the account screen, bookmarks, history, notifications,
 * settings — resolve to the site default. A crawler cannot reach them, an
 * unfurl of one would only ever be seen by the person who is already signed
 * in, and inventing per-page strings for them would be maintenance with no
 * reader. They keep their client-side titles, which is what the tab shows.
 */
final class PageMetadata
{
    /**
     * The one-line summaries the four standing pages open with.
     *
     * A second copy of prose that also lives in
     * `resources/js/content/information.ts`, which is a real cost and is
     * accepted for one reason: the alternative is a crawler receiving nothing
     * specific about the page that describes what Clover does with your data.
     * `InformationCopyTest` asserts the two files agree word for word and
     * fails if either moves.
     *
     * @var array<string, string>
     */
    private const INFORMATION_SUMMARIES = [
        'Rules' => 'Three of them, and they cover what anons write here rather than what Clover mirrors from 4chan.',
        'FAQ' => 'What Clover is, where the content comes from, and what an account changes.',
        'Terms' => 'The short version: read what you like, own what you post, and expect nothing.',
        'Privacy' => 'What Clover keeps, what it never had, and who can see it. The list is short on purpose.',
    ];

    /**
     * What each error status says, matching `resources/js/pages/error.tsx`.
     *
     * @var array<int, string>
     */
    private const ERROR_TITLES = [
        403 => 'Not yours to see',
        404 => 'No such page',
        419 => 'The page expired',
        500 => 'Something broke',
        503 => 'Down for maintenance',
    ];

    /**
     * Resolve the tags for one Inertia response.
     *
     * @param  array<string, mixed>  $page  Inertia's own page array: component, props, url, version.
     * @return array{title: string, socialTitle: string, description: string, type: string}
     */
    public static function for(array $page): array
    {
        $component = (string) ($page['component'] ?? '');
        /** @var array<string, mixed> $props */
        $props = (array) ($page['props'] ?? []);

        $default = [
            'title' => config('app.name'),
            'socialTitle' => config('app.name'),
            'description' => config('clover.meta_description'),
            'type' => 'website',
        ];

        return match ($component) {
            'welcome' => [
                /**
                 * The tab says "Clover" while the card says what Clover is.
                 * That split is the page component's own decision — it is the
                 * only screen passing a separate `tab` — and it is right: a
                 * bookmark wants the name, a shared link wants the sentence.
                 */
                'title' => config('app.name'),
                'socialTitle' => 'Anonymous discussion, organised by board',
                'description' => config('clover.meta_description'),
                'type' => 'website',
            ],

            'board' => self::board($props) ?? $default,
            'thread' => self::thread($props) ?? $default,

            'communities' => [
                'title' => 'Communities',
                'socialTitle' => 'Communities',
                'description' => 'Every board Clover mirrors, grouped by subject. Follow the ones you read.',
                'type' => 'website',
            ],

            'status' => [
                'title' => 'Status',
                'socialTitle' => 'Status',
                'description' => 'What Clover has synced from 4chan, and when it last ran.',
                'type' => 'website',
            ],

            'information' => self::information($props) ?? $default,
            'error' => self::error($props),

            default => $default,
        };
    }

    /**
     * @param  array<string, mixed>  $props
     * @return array{title: string, socialTitle: string, description: string, type: string}|null
     */
    private static function board(array $props): ?array
    {
        $slug = Arr::get($props, 'board.slug');
        $name = Arr::get($props, 'board.name');

        if (! is_string($slug) || ! is_string($name)) {
            return null;
        }

        $description = Arr::get($props, 'board.description');
        $title = "{$slug} — {$name}";

        return [
            'title' => $title,
            'socialTitle' => $title,
            'description' => is_string($description) && $description !== ''
                ? "{$name} on Clover. {$description}"
                : "{$name} on Clover.",
            'type' => 'website',
        ];
    }

    /**
     * @param  array<string, mixed>  $props
     * @return array{title: string, socialTitle: string, description: string, type: string}|null
     */
    private static function thread(array $props): ?array
    {
        $title = Arr::get($props, 'thread.title');

        /* A post number matching nothing is the ordinary case here, not an
           error: 4chan prunes threads off the end of a board constantly, and
           the page has a real not-found state for it. Both halves get their
           own words rather than the site default. */
        if (! is_string($title)) {
            return [
                'title' => 'Thread not found',
                'socialTitle' => 'Thread not found',
                'description' => 'This thread is no longer on Clover. 4chan prunes threads off the end of a board and Clover does not keep what it has dropped.',
                'type' => 'website',
            ];
        }

        $board = Arr::get($props, 'thread.board');
        $replies = Arr::get($props, 'thread.replies');

        $description = is_string($board)
            ? sprintf(
                '%s on %s. Read it on Clover without an account.',
                is_numeric($replies)
                    ? sprintf('%s %s', number_format((float) $replies), (int) $replies === 1 ? 'reply' : 'replies')
                    : 'A thread',
                $board,
            )
            : config('clover.meta_description');

        return [
            'title' => $title,
            'socialTitle' => $title,
            'description' => $description,
            /* `article`, which is what the page component sends, and what
               tells an unfurl this is a document rather than a site. */
            'type' => 'article',
        ];
    }

    /**
     * @param  array<string, mixed>  $props
     * @return array{title: string, socialTitle: string, description: string, type: string}|null
     */
    private static function information(array $props): ?array
    {
        $title = Arr::get($props, 'title');

        if (! is_string($title) || ! isset(self::INFORMATION_SUMMARIES[$title])) {
            return null;
        }

        return [
            'title' => $title,
            'socialTitle' => $title,
            'description' => self::INFORMATION_SUMMARIES[$title],
            'type' => 'website',
        ];
    }

    /**
     * @param  array<string, mixed>  $props
     * @return array{title: string, socialTitle: string, description: string, type: string}
     */
    private static function error(array $props): array
    {
        $status = Arr::get($props, 'status');
        $title = is_numeric($status)
            ? (self::ERROR_TITLES[(int) $status] ?? 'Unexpected response')
            : 'Unexpected response';

        return [
            'title' => $title,
            'socialTitle' => $title,
            'description' => config('clover.meta_description'),
            'type' => 'website',
        ];
    }

    /**
     * The four summaries, for the test that keeps them honest.
     *
     * @return array<string, string>
     */
    public static function informationSummaries(): array
    {
        return self::INFORMATION_SUMMARIES;
    }
}
